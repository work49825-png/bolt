import { generateText } from 'ai';
import { LLMManager } from '~/lib/modules/llm/manager';
import { PROVIDER_LIST, DEFAULT_PROVIDER } from '~/utils/constants';
import type { IProviderSetting } from '~/types/model';
import { stripIndents } from '~/utils/stripIndent';
import { createScopedLogger } from '~/utils/logger';
import { buildSpecSchema, createFallbackBuildSpec, type BuildSpec } from './types';
import { ORCHESTRATION_USER_APP_RULES } from './build-rules';
import { isOpenAIChatCompletionModel, pickPreferredOpenAIModelName } from '~/lib/modules/llm/openai-chat-models';

const logger = createScopedLogger('intent-refiner');

const REFINER_SYSTEM = stripIndents`
  You are a principal software architect. The user gives a short app idea.
  Expand it into a complete full-stack build specification as JSON only.

  Rules:
  ${ORCHESTRATION_USER_APP_RULES}
  - Default requiresAuth=true and requiresDatabase=true unless the app is clearly static (landing page only, game, calculator).
  - Default stack: React + Vite + TypeScript, Supabase, Tailwind CSS.
  - Use Supabase Auth with email/password only. Never custom auth tables.
  - Infer entities, pages, and features from the user's exact request; do not ask questions.
  - NEVER create entity tables for login credentials — no users table with password columns; auth is Supabase Auth only. Use profiles linked to auth.users.
  - preferredTemplate: "Fullstack SaaS" when requiresAuth && requiresDatabase; else "Vite React" or "blank".
  - title: short name that reflects the user's app (not a generic label like "Todo App" unless they asked for todos).
  - expandedPrompt: detailed paragraph describing THIS user's application (screens, data, workflows) for an AI code generator — never a unrelated demo app.
  - pages: routes the user needs (auth pages plus app-specific screens); name routes for their domain (e.g. /bookings, /inventory), not generic demos.
  - entities: tables/columns that match the user's domain, not a one-size-fits-all todo schema unless they asked for tasks.
  - assumptions: list what you inferred from their message only.

  Respond with ONLY valid JSON matching this schema (no markdown):
  {
    "title": string,
    "appType": "saas" | "dashboard" | "crud" | "landing" | "other",
    "requiresAuth": boolean,
    "requiresDatabase": boolean,
    "entities": [{ "name": string, "description"?: string, "columns": [{ "name": string, "type": string, "description"?: string }] }],
    "pages": string[],
    "stack": { "frontend": string, "backend": string, "styling": string },
    "expandedPrompt": string,
    "assumptions": string[],
    "preferredTemplate"?: string
  }
`;

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);

  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

async function resolveModel(
  model: string,
  providerName: string,
  apiKeys?: Record<string, string>,
  providerSettings?: Record<string, IProviderSetting>,
  serverEnv?: Env,
) {
  const provider = PROVIDER_LIST.find((p) => p.name === providerName) || DEFAULT_PROVIDER;

  const modelsList = [
    ...(provider.staticModels || []),
    ...(await LLMManager.getInstance().getModelListFromProvider(provider, {
      apiKeys,
      providerSettings,
      serverEnv: serverEnv as any,
    })),
  ];

  const modelDetails = modelsList.find((m) => m.name === model) || modelsList[0];

  if (!modelDetails) {
    throw new Error(`No models found for provider ${provider.name}`);
  }

  let resolvedModelName = modelDetails.name;

  if (providerName === 'OpenAI' && !isOpenAIChatCompletionModel(resolvedModelName)) {
    const chatModelName = pickPreferredOpenAIModelName(modelsList);

    if (!chatModelName) {
      throw new Error(
        `Model "${resolvedModelName}" is not supported for intent refinement. Use gpt-4o or gpt-4o-mini.`,
      );
    }

    logger.warn(`Refiner: replacing ${resolvedModelName} with ${chatModelName}`);
    resolvedModelName = chatModelName;
  }

  return provider.getModelInstance({
    model: resolvedModelName,
    serverEnv,
    apiKeys,
    providerSettings,
  });
}

export async function refineIntent(options: {
  message: string;
  model: string;
  providerName: string;
  apiKeys?: Record<string, string>;
  providerSettings?: Record<string, IProviderSetting>;
  env?: Env;
}): Promise<BuildSpec> {
  const { message, model, providerName, apiKeys, providerSettings, env } = options;

  try {
    const llmModel = await resolveModel(model, providerName, apiKeys, providerSettings, env);

    const resp = await generateText({
      model: llmModel,
      system: REFINER_SYSTEM,
      prompt: `User request:\n${message}`,
      maxTokens: 4096,
    });

    const parsed = buildSpecSchema.safeParse(JSON.parse(extractJson(resp.text)));

    if (parsed.success) {
      return parsed.data;
    }

    logger.warn('BuildSpec validation failed, retrying once', parsed.error.message);

    const retry = await generateText({
      model: llmModel,
      system: REFINER_SYSTEM + '\nYour previous response was invalid JSON. Return ONLY valid JSON.',
      prompt: `User request:\n${message}`,
      maxTokens: 4096,
    });

    const retryParsed = buildSpecSchema.safeParse(JSON.parse(extractJson(retry.text)));

    if (retryParsed.success) {
      return retryParsed.data;
    }

    logger.error('BuildSpec validation failed after retry', retryParsed.error.message);

    return createFallbackBuildSpec(message);
  } catch (error) {
    logger.error('Intent refinement failed', error);
    return createFallbackBuildSpec(message);
  }
}
