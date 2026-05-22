import type { StreamingMessageParserOptions } from './message-parser';
import { workbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('WorkbenchParserCallbacks');

/** Shared parser callbacks — used for streaming chat and one-off setup artifacts. */
export function createWorkbenchParserCallbacks(): StreamingMessageParserOptions['callbacks'] {
  return {
    onArtifactOpen: (data) => {
      logger.trace('onArtifactOpen', data);
      workbenchStore.showWorkbench.set(true);
      workbenchStore.addArtifact(data);
    },
    onArtifactClose: (data) => {
      logger.trace('onArtifactClose');
      workbenchStore.updateArtifact(data, { closed: true });
    },
    onActionOpen: (data) => {
      logger.trace('onActionOpen', data.action);

      if (data.action.type === 'file') {
        workbenchStore.addAction(data);
      }
    },
    onActionClose: (data) => {
      logger.trace('onActionClose', data.action);

      if (data.action.type !== 'file') {
        workbenchStore.addAction(data);
      }

      workbenchStore.runAction(data);
    },
    onActionStream: (data) => {
      logger.trace('onActionStream', data.action);
      workbenchStore.runAction(data, true);
    },
  };
}
