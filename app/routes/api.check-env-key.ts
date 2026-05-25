import { json, type LoaderFunction } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import { getApiKeysFromCookie } from '~/lib/api/cookies';
import { getServerEnvRecord } from '~/lib/.server/get-server-env';
import { isProviderApiKeyConfigured } from '~/lib/.server/provider-env-keys';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export const loader: LoaderFunction = async ({ context, request }) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');

  if (!provider) {
    return json({ isSet: false }, { headers: NO_STORE_HEADERS });
  }

  const llmManager = LLMManager.getInstance(getServerEnvRecord(context));
  const providerInstance = llmManager.getProvider(provider);

  if (!providerInstance) {
    return json({ isSet: false }, { headers: NO_STORE_HEADERS });
  }

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);

  const isSet = isProviderApiKeyConfigured(providerInstance, context, apiKeys);

  return json({ isSet }, { headers: NO_STORE_HEADERS });
};
