import type { Message } from 'ai';
import { startTransition, useCallback, useState } from 'react';
import { EnhancedStreamingMessageParser } from '~/lib/runtime/enhanced-message-parser';
import { createWorkbenchParserCallbacks } from '~/lib/runtime/workbench-parser-callbacks';

const messageParser = new EnhancedStreamingMessageParser({
  callbacks: createWorkbenchParserCallbacks(),
});

const extractTextContent = (message: Message) =>
  Array.isArray(message.content)
    ? (message.content.find((item) => item.type === 'text')?.text as string) || ''
    : message.content;

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<{ [key: number]: string }>({});

  const parseMessages = useCallback((messages: Message[], isLoading: boolean) => {
    let lastAssistantIndex = -1;

    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        lastAssistantIndex = i;
        break;
      }
    }

    /*
     * Run the stateful parser OUTSIDE setState so React's concurrent renderer can't
     * accidentally replay the reducer and double-advance the parser's internal state.
     */
    const updates: { [key: number]: string } = {};

    for (const [index, message] of messages.entries()) {
      if (message.role !== 'assistant') {
        continue;
      }

      // While streaming, only re-parse the active assistant message.
      if (isLoading && index !== lastAssistantIndex) {
        continue;
      }

      const isThisMessageStreaming = isLoading && index === lastAssistantIndex;
      const cumulative = messageParser.parse(message.id, extractTextContent(message), isThisMessageStreaming);
      updates[index] = cumulative;
    }

    if (Object.keys(updates).length === 0) {
      return;
    }

    setParsedMessages((prev) => {
      /*
       * Avoid a state update if nothing actually changed (parser may emit identical
       * cumulative text for sampled calls). Saves a render.
       */
      let changed = false;

      for (const key in updates) {
        if (prev[key as unknown as number] !== updates[key as unknown as number]) {
          changed = true;
          break;
        }
      }

      if (!changed) {
        return prev;
      }

      return { ...prev, ...updates };
    });
  }, []);

  const parseMessagesDeferred = useCallback(
    (messages: Message[], isLoading: boolean) => {
      startTransition(() => {
        parseMessages(messages, isLoading);
      });
    },
    [parseMessages],
  );

  return { parsedMessages, parseMessages: parseMessagesDeferred };
}
