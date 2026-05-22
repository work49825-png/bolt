import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { refineIntent } from '~/lib/orchestration/intent-refiner.server';
import type { ProviderInfo } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';
import { getServerEnv } from '~/lib/.server/get-server-env';

const logger = createScopedLogger('api.refine-intent');

export async function action({ context, request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { message, model, provider } = await request.json<{
      message: string;
      model: string;
      provider: ProviderInfo;
    }>();

    if (!message?.trim()) {
      return json({ error: 'Message is required' }, { status: 400 });
    }

    if (!model || !provider?.name) {
      return json({ error: 'Model and provider are required' }, { status: 400 });
    }

    const cookieHeader = request.headers.get('Cookie');
    const apiKeys = getApiKeysFromCookie(cookieHeader);
    const providerSettings = getProviderSettingsFromCookie(cookieHeader);

    const buildSpec = await refineIntent({
      message: message.trim(),
      model,
      providerName: provider.name,
      apiKeys,
      providerSettings,
      env: getServerEnv(context),
    });

    return json({ buildSpec });
  } catch (error) {
    logger.error('refine-intent failed', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to refine intent' }, { status: 500 });
  }
}
