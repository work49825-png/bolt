import type { AppLoadContext } from '@remix-run/cloudflare';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: any,
  _loadContext: AppLoadContext,
) {
  // Lazy-import modules that pull in browser-only packages (e.g. react-dnd-html5-backend)
  // at request time instead of at module load time, to avoid crashing the Node.js bundle.
  const [{ renderHeadToString }, { Head }, { themeStore }] = await Promise.all([
    import('remix-island'),
    import('./root'),
    import('~/lib/stores/theme'),
  ]);

  responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
  responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

  let readable: ReadableStream<Uint8Array>;

  try {
    readable = await renderToReadableStream(<RemixServer context={remixContext} url={request.url} />, {
      signal: request.signal,
      onError(error: unknown) {
        console.error('[entry.server] render error:', error);
        responseStatusCode = 500;
      },
    });
  } catch (err) {
    console.error('[entry.server] renderToReadableStream threw:', err);
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);

    return new Response(`SSR Error: ${msg}`, { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }

  let head = '';

  try {
    head = renderHeadToString({ request, remixContext, Head });
  } catch (err) {
    console.error('[entry.server] renderHeadToString threw:', err);
  }

  const theme = (() => {
    try {
      return themeStore.get();
    } catch {
      return 'light';
    }
  })();

  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new Uint8Array(
          new TextEncoder().encode(
            `<!DOCTYPE html><html lang="en" data-theme="${theme}"><head>${head}</head><body><div id="root" class="w-full h-full">`,
          ),
        ),
      );

      const reader = readable.getReader();

      function read() {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              controller.enqueue(new Uint8Array(new TextEncoder().encode('</div></body></html>')));
              controller.close();

              return;
            }

            controller.enqueue(value);
            read();
          })
          .catch((error) => {
            controller.error(error);
            readable.cancel();
          });
      }
      read();
    },

    cancel() {
      readable.cancel();
    },
  });

  if (isbot(request.headers.get('user-agent') || '')) {
    await readable.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
