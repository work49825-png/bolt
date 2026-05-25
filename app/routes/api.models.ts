import { json } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import { getServerEnv } from '~/lib/.server/get-server-env';
import { getProviderEnvKeysStatus, resolveDefaultProvider } from '~/lib/.server/provider-env-keys';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { ProviderInfo } from '~/types/model';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';

interface ModelsResponse {
  modelList: ModelInfo[];
  providers: ProviderInfo[];
  defaultProvider: ProviderInfo;
  /** Whether each provider has an API key from cookies or server env (e.g. OPENAI_API_KEY on Vercel). */
  envKeysSet: Record<string, boolean>;
}

let cachedProviders: ProviderInfo[] | null = null;

function toProviderInfo(provider: { name: string; staticModels: ProviderInfo['staticModels']; getApiKeyLink?: string; labelForGetApiKey?: string; icon?: string }): ProviderInfo {
  return {
    name: provider.name,
    staticModels: provider.staticModels,
    getApiKeyLink: provider.getApiKeyLink,
    labelForGetApiKey: provider.labelForGetApiKey,
    icon: provider.icon,
  };
}

function getProvidersList(llmManager: LLMManager): ProviderInfo[] {
  if (!cachedProviders) {
    cachedProviders = llmManager.getAllProviders().map((provider) => toProviderInfo(provider));
  }

  return cachedProviders;
}

export async function loader({
  request,
  params,
  context,
}: {
  request: Request;
  params: { provider?: string };
  context: {
    cloudflare?: {
      env: Record<string, string>;
    };
  };
}): Promise<Response> {
  const serverEnv = getServerEnv(context) as unknown as Record<string, string>;
  const llmManager = LLMManager.getInstance(serverEnv);

  // Get client side maintained API keys and provider settings from cookies
  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  const providers = getProvidersList(llmManager);
  const allProviders = llmManager.getAllProviders();
  const envKeysSet = getProviderEnvKeysStatus(allProviders, context, apiKeys);
  const resolvedDefault = resolveDefaultProvider(allProviders, context, apiKeys);
  const defaultProvider = toProviderInfo(resolvedDefault);

  let modelList: ModelInfo[] = [];

  if (params.provider) {
    // Only update models for the specific provider
    const provider = llmManager.getProvider(params.provider);

    if (provider) {
      modelList = await llmManager.getModelListFromProvider(provider, {
        apiKeys,
        providerSettings,
        serverEnv,
      });
    }
  } else {
    // Update all models
    modelList = await llmManager.updateModelList({
      apiKeys,
      providerSettings,
      serverEnv,
    });
  }

  return json<ModelsResponse>(
    {
      modelList,
      providers,
      defaultProvider,
      envKeysSet,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
