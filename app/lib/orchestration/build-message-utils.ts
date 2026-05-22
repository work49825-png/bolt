type OrchestrationMessageContent = string | Array<{ type: string; text?: string }> | undefined;

export const ORCHESTRATED_BUILD_MARKER = '[ORCHESTRATED BUILD';

export function contentHasOrchestratedBuild(content: OrchestrationMessageContent): boolean {
  if (content == null) {
    return false;
  }

  if (typeof content === 'string') {
    return content.includes(ORCHESTRATED_BUILD_MARKER);
  }

  if (Array.isArray(content)) {
    return content.some(
      (part) => part.type === 'text' && typeof part.text === 'string' && part.text.includes(ORCHESTRATED_BUILD_MARKER),
    );
  }

  return false;
}

export function messagesHaveOrchestratedBuild(messages: Array<{ content?: OrchestrationMessageContent }>): boolean {
  return messages.some((message) => contentHasOrchestratedBuild(message.content));
}
