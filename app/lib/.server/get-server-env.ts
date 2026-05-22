type ServerContext = {
  cloudflare?: {
    env?: unknown;
  };
};

export function getServerEnv(context?: ServerContext): Env {
  const cloudflareEnv = context?.cloudflare?.env;

  if (cloudflareEnv && typeof cloudflareEnv === 'object') {
    return cloudflareEnv as Env;
  }

  return process.env as unknown as Env;
}

export function getServerEnvRecord(context?: ServerContext): Record<string, string> {
  return getServerEnv(context) as unknown as Record<string, string>;
}

export function getEnvValue(context: ServerContext | undefined, key: string): string | undefined {
  const env = getServerEnv(context) as unknown as Record<string, string | undefined>;
  return env[key] ?? process.env[key];
}

export function createVercelLoadContext(): { cloudflare: { env: Env } } {
  return {
    cloudflare: {
      env: process.env as unknown as Env,
    },
  };
}

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === '1';
}

export function isCloudflarePagesRuntime(context?: ServerContext): boolean {
  if (isVercelRuntime()) {
    return false;
  }

  return !!(
    getEnvValue(context, 'CF_PAGES') ||
    getEnvValue(context, 'CF_PAGES_URL') ||
    getEnvValue(context, 'CF_PAGES_COMMIT_SHA')
  );
}
