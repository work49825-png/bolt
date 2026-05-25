import process from 'node:process';
import type { BaseProvider } from '~/lib/modules/llm/base-provider';
import { getApiKeysFromCookie } from '~/lib/api/cookies';
import { LLMManager } from '~/lib/modules/llm/manager';
import { getEnvValue, getServerEnvRecord, type ServerContext } from '~/lib/.server/get-server-env';

/** Node's real process.env — not affected by client polyfills in the server bundle. */
export function getNodeEnvValue(key: string): string | undefined {
  return process.env[key];
}

export function isProviderApiKeyConfigured(
  provider: BaseProvider,
  context: ServerContext | undefined,
  apiKeys?: Record<string, string>,
): boolean {
  const envVarName = provider.config.apiTokenKey;

  if (!envVarName) {
    return false;
  }

  return !!(
    apiKeys?.[provider.name] ||
    getEnvValue(context, envVarName) ||
    getNodeEnvValue(envVarName)
  );
}

export function getProviderEnvKeysStatus(
  providers: BaseProvider[],
  context: ServerContext | undefined,
  apiKeys?: Record<string, string>,
): Record<string, boolean> {
  const status: Record<string, boolean> = {};

  for (const provider of providers) {
    status[provider.name] = isProviderApiKeyConfigured(provider, context, apiKeys);
  }

  return status;
}

/** Prefer a provider that has a configured API key (e.g. OPENAI_API_KEY on Vercel). */
export function resolveDefaultProvider(
  providers: BaseProvider[],
  context: ServerContext | undefined,
  apiKeys?: Record<string, string>,
): BaseProvider {
  const preferredOrder = ['OpenAI', 'Anthropic', 'Google', 'Groq', 'OpenRouter'];

  for (const name of preferredOrder) {
    const provider = providers.find((p) => p.name === name);

    if (provider && isProviderApiKeyConfigured(provider, context, apiKeys)) {
      return provider;
    }
  }

  for (const provider of providers) {
    if (isProviderApiKeyConfigured(provider, context, apiKeys)) {
      return provider;
    }
  }

  const openai = providers.find((p) => p.name === 'OpenAI');

  return openai ?? providers[0];
}

/** Merge cookie API keys with server env vars (e.g. OPENAI_API_KEY on Vercel). */
export function getMergedApiKeys(context: ServerContext | undefined, cookieHeader: string | null): Record<string, string> {
  const apiKeys = { ...getApiKeysFromCookie(cookieHeader) };
  const llmManager = LLMManager.getInstance(getServerEnvRecord(context));

  for (const provider of llmManager.getAllProviders()) {
    if (apiKeys[provider.name]) {
      continue;
    }

    const tokenKey = provider.config.apiTokenKey;

    if (!tokenKey) {
      continue;
    }

    const value = getEnvValue(context, tokenKey) ?? getNodeEnvValue(tokenKey);

    if (value) {
      apiKeys[provider.name] = value;
    }
  }

  return apiKeys;
}
