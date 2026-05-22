import type { AppLoadContext } from '@remix-run/cloudflare';
import { RemixServer } from '@remix-run/react';
import { isVercelRuntime } from '~/lib/.server/get-server-env';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: any,
  loadContext: AppLoadContext,
) {
  if (isVercelRuntime()) {
    const { handleRequest: vercelHandleRequest } = await import('@vercel/remix');

    responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
    responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

    return vercelHandleRequest(
      request,
      responseStatusCode,
      responseHeaders,
      <RemixServer context={remixContext} url={request.url} />,
    );
  }

  const { default: cloudflareHandleRequest } = await import('./entry.server.cloudflare');

  return cloudflareHandleRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext);
}
