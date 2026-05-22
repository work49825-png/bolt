import type { ModelInfo } from './types';

/** OpenAI model IDs that must not be used for bolt chat / code generation. */
const NON_CHAT_ID_PATTERN =
  /image|dall-e|gpt-image|whisper|tts|audio|transcribe|embed|moderation|realtime|sora|davinci-00/i;

const PREFERRED_OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] as const;

export function isOpenAIChatCompletionModel(modelId: string): boolean {
  const id = modelId.trim().toLowerCase();

  if (!id || NON_CHAT_ID_PATTERN.test(id)) {
    return false;
  }

  return id.startsWith('gpt-') || /^o\d/.test(id) || id.startsWith('chatgpt-4o');
}

export function pickPreferredOpenAIModelName(models: ModelInfo[]): string | undefined {
  const chatModels = models.filter((m) => m.provider === 'OpenAI' && isOpenAIChatCompletionModel(m.name));

  if (chatModels.length === 0) {
    return undefined;
  }

  for (const preferred of PREFERRED_OPENAI_MODELS) {
    const match = chatModels.find((m) => m.name === preferred);

    if (match) {
      return match.name;
    }
  }

  return chatModels[0]?.name;
}

export function resolveOpenAIChatModel(models: ModelInfo[], requestedModel?: string): ModelInfo | undefined {
  const chatModels = models.filter((m) => isOpenAIChatCompletionModel(m.name));

  if (chatModels.length === 0) {
    return undefined;
  }

  if (requestedModel && isOpenAIChatCompletionModel(requestedModel)) {
    const exact = chatModels.find((m) => m.name === requestedModel);

    if (exact) {
      return exact;
    }
  }

  const preferredName = pickPreferredOpenAIModelName(chatModels);

  if (preferredName) {
    return chatModels.find((m) => m.name === preferredName);
  }

  return chatModels[0];
}
