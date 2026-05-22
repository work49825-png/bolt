import { EnhancedStreamingMessageParser } from './enhanced-message-parser';
import { createWorkbenchParserCallbacks } from './workbench-parser-callbacks';

/** Parse a complete bolt artifact string without resetting the main chat parser. */
export function parseArtifactContent(messageId: string, content: string): void {
  const parser = new EnhancedStreamingMessageParser({
    callbacks: createWorkbenchParserCallbacks(),
  });

  /*
   * Content is already a complete artifact, so run the final (non-streaming) pass directly
   * to ensure the enhancement step (if any) and all artifact/action callbacks fire.
   */
  parser.parse(messageId, content, false);
}
