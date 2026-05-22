import { describe, expect, it } from 'vitest';
import {
  isOpenAIChatCompletionModel,
  pickPreferredOpenAIModelName,
  resolveOpenAIChatModel,
} from './openai-chat-models';
import type { ModelInfo } from './types';

const chatModels: ModelInfo[] = [
  { name: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', maxTokenAllowed: 128000 },
  { name: 'gpt-4o-mini', label: 'Mini', provider: 'OpenAI', maxTokenAllowed: 128000 },
  { name: 'chatgpt-image-latest', label: 'Image', provider: 'OpenAI', maxTokenAllowed: 32000 },
];

describe('openai-chat-models', () => {
  it('rejects image and audio models', () => {
    expect(isOpenAIChatCompletionModel('chatgpt-image-latest')).toBe(false);
    expect(isOpenAIChatCompletionModel('dall-e-3')).toBe(false);
    expect(isOpenAIChatCompletionModel('whisper-1')).toBe(false);
  });

  it('accepts gpt and o-series chat models', () => {
    expect(isOpenAIChatCompletionModel('gpt-4o')).toBe(true);
    expect(isOpenAIChatCompletionModel('gpt-4o-mini')).toBe(true);
    expect(isOpenAIChatCompletionModel('o1-mini')).toBe(true);
  });

  it('pickPreferredOpenAIModelName prefers gpt-4o', () => {
    expect(pickPreferredOpenAIModelName(chatModels)).toBe('gpt-4o');
  });

  it('resolveOpenAIChatModel replaces image model request', () => {
    const resolved = resolveOpenAIChatModel(chatModels, 'chatgpt-image-latest');
    expect(resolved?.name).toBe('gpt-4o');
  });
});
