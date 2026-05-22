import type { ProviderInfo } from '~/types/model';
import type { BuildSpec } from './types';
import { composeOrchestratedPrompt } from './prompt-composer';
import { ensureBackendReady } from './infra-orchestrator';
import { resolveTemplateFromBuildSpec } from '~/utils/selectStarterTemplate';

export type OrchestrationStatus = 'idle' | 'refining' | 'preparing-backend' | 'done';

export async function runFullStackOrchestration(options: {
  message: string;
  model: string;
  provider: ProviderInfo;
  chatId?: string;
  onStatus?: (status: OrchestrationStatus) => void;
}): Promise<{
  buildSpec: BuildSpec;
  composedMessage: string;
  supabase: {
    isConnected: boolean;
    hasSelectedProject: boolean;
    credentials?: { anonKey?: string; supabaseUrl?: string };
  };
  templateSelection: { template: string; title: string } | null;
  promptId: string;
}> {
  const { message, model, provider, chatId, onStatus } = options;

  onStatus?.('refining');

  const refineResponse = await fetch('/api/refine-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, model, provider }),
  });

  if (!refineResponse.ok) {
    const err = (await refineResponse.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'Failed to refine intent');
  }

  const { buildSpec } = (await refineResponse.json()) as { buildSpec: BuildSpec };

  onStatus?.('preparing-backend');

  const supabase = await ensureBackendReady({ buildSpec, chatId });

  const supabaseReady =
    supabase.isConnected &&
    supabase.hasSelectedProject &&
    Boolean(supabase.credentials?.supabaseUrl) &&
    Boolean(supabase.credentials?.anonKey);

  const composedMessage = composeOrchestratedPrompt(buildSpec, message, { supabaseReady });
  const templateSelection = resolveTemplateFromBuildSpec(buildSpec, { supabaseReady });

  onStatus?.('done');

  return {
    buildSpec,
    composedMessage,
    supabase: {
      isConnected: supabase.isConnected,
      hasSelectedProject: supabase.hasSelectedProject,
      credentials: supabase.credentials,
    },
    templateSelection,
    promptId: 'fullstack-auto',
  };
}
