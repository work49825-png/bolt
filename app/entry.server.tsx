import type { AppLoadContext } from '@remix-run/cloudflare';
import { RemixServer } from '@remix-run/react';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: any,
  _loadContext: AppLoadContext,
) {
  // All imports are dynamic to avoid pulling browser-only packages into the
  // server bundle at module-load time (e.g. react-dnd-html5-backend, @webcontainer/api).
  // react-dom/server resolves to the Node stream API in Node.js environments.
  // We need the Web Streams version (renderToReadableStream) from react-dom/server.browser.
  const { renderToReadableStream } = await import('react-dom/server.browser' as string);
  const { isbot } = await import('isbot');
  const { renderHeadToString } = await import('remix-island');
  const { Head } = await import('./root');
  const { themeStore } = await import('~/lib/stores/theme');

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
