import type { File, FileMap } from '~/lib/stores/files';
import { createCommandActionsString, detectProjectCommands } from '~/utils/projectCommands';

export function assistantMessageHasProjectArtifacts(content: string): boolean {
  return content.includes('<boltArtifact') || content.includes('<boltAction');
}

export function assistantMessageHasStartAction(content: string): boolean {
  return /<boltAction[^>]*type=["']start["']/i.test(content);
}

export async function createPostBuildSetupArtifactContent(files: FileMap): Promise<string | null> {
  const fileContents = Object.entries(files)
    .filter((entry): entry is [string, File] => entry[1]?.type === 'file')
    .map(([path, entry]) => ({
      path,
      content: entry.content,
    }));

  if (fileContents.length === 0) {
    return null;
  }

  const commands = await detectProjectCommands(fileContents);
  const commandActions = createCommandActionsString(commands);

  if (!commandActions) {
    return null;
  }

  return `<boltArtifact id="post-build-setup" title="Project setup" type="bundled">${commandActions}</boltArtifact>`;
}
