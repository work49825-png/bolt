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
