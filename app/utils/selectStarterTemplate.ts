import ignore from 'ignore';
import type { ProviderInfo } from '~/types/model';
import type { Template } from '~/types/template';
import {
  FULLSTACK_SAAS_TEMPLATE_NAME,
  getFullstackSaasTemplateFiles,
} from '~/lib/orchestration/fullstack-saas-template';
import type { BuildSpec } from '~/lib/orchestration/types';
import { STARTER_TEMPLATES } from './constants';

const starterTemplateSelectionPrompt = (templates: Template[]) => `
You are an experienced developer who helps people choose the best starter template for their projects.
IMPORTANT: Vite is preferred
IMPORTANT: Only choose shadcn templates if the user explicitly asks for shadcn.

Available templates:
<template>
  <name>blank</name>
  <description>Empty starter for simple scripts and trivial tasks that don't require a full template setup</description>
  <tags>basic, script</tags>
</template>
${templates
  .map(
    (template) => `
<template>
  <name>${template.name}</name>
  <description>${template.description}</description>
  ${template.tags ? `<tags>${template.tags.join(', ')}</tags>` : ''}
</template>
`,
  )
  .join('\n')}

Response Format:
<selection>
  <templateName>{selected template name}</templateName>
  <title>{a proper title for the project}</title>
</selection>

Examples:

<example>
User: I need a recipe sharing site with comments
Response:
<selection>
  <templateName>react-basic-starter</templateName>
  <title>Recipe sharing application</title>
</selection>
</example>

<example>
User: Write a script to generate numbers from 1 to 100
Response:
<selection>
  <templateName>blank</templateName>
  <title>script to generate numbers from 1 to 100</title>
</selection>
</example>

Instructions:
1. For trivial tasks and simple scripts, always recommend the blank template
2. For more complex projects, recommend templates from the provided list
3. Follow the exact XML format
4. Consider both technical requirements and tags
5. If no perfect match exists, recommend the closest option

Important: Provide only the selection tags in your response, no additional text.
MOST IMPORTANT: YOU DONT HAVE TIME TO THINK JUST START RESPONDING BASED ON HUNCH 
`;

const templates: Template[] = STARTER_TEMPLATES.filter((t) => !t.name.includes('shadcn'));

const parseSelectedTemplate = (llmOutput: string): { template: string; title: string } | null => {
  try {
    // Extract content between <templateName> tags
    const templateNameMatch = llmOutput.match(/<templateName>(.*?)<\/templateName>/);
    const titleMatch = llmOutput.match(/<title>(.*?)<\/title>/);

    if (!templateNameMatch) {
      return null;
    }

    return { template: templateNameMatch[1].trim(), title: titleMatch?.[1].trim() || 'Untitled Project' };
  } catch (error) {
    console.error('Error parsing template selection:', error);
    return null;
  }
};

export function resolveTemplateFromBuildSpec(
  buildSpec: BuildSpec,
  options: { supabaseReady?: boolean } = {},
): { template: string; title: string } | null {
  const { supabaseReady = false } = options;

  /*
   * Only pick the Fullstack SaaS template when Supabase is actually connected;
   * otherwise the imported template would call createClient with empty env vars
   * and the preview would be blank.
   */
  if (supabaseReady && buildSpec.requiresAuth && buildSpec.requiresDatabase) {
    return { template: FULLSTACK_SAAS_TEMPLATE_NAME, title: buildSpec.title };
  }

  if (buildSpec.preferredTemplate) {
    const known = STARTER_TEMPLATES.find((t) => t.name === buildSpec.preferredTemplate);

    if (known) {
      return { template: known.name, title: buildSpec.title };
    }
  }

  return null;
}

function buildTemplateArtifact(
  files: { path: string; content: string }[],
  templateLabel: string,
  title?: string,
  continuationPrompt?: string,
) {
  const assistantMessage = `
Bolt is initializing your project with the required files using the ${templateLabel} template.
<boltArtifact id="imported-files" title="${title || 'Create initial files'}" type="bundled">
${files
  .map(
    (file) =>
      `<boltAction type="file" filePath="${file.path}">
${file.content}
</boltAction>`,
  )
  .join('\n')}
</boltArtifact>
`;

  const specBlock = continuationPrompt
    ? `
IMPLEMENT THIS FULL SPECIFICATION NOW (do not stop at the starter dashboard placeholder):

${continuationPrompt}
`
    : 'Now implement my original request in full.';

  const userMessage = `
---
Template import is complete. The Fullstack SaaS auth shell is in place.
---
${specBlock}

CRITICAL:
- REPLACE the placeholder Dashboard ("Extend this dashboard with your app features") with the full app UI
- Add Supabase migrations + queries for all required tables
- Extend Login/Signup only if needed — do not break auth
- Run \`npm install && npm run dev\` if dependencies are not installed yet
`;

  return { assistantMessage, userMessage };
}

export const selectStarterTemplate = async (options: { message: string; model: string; provider: ProviderInfo }) => {
  const { message, model, provider } = options;
  const requestBody = {
    message,
    model,
    provider,
    system: starterTemplateSelectionPrompt(templates),
  };
  const response = await fetch('/api/llmcall', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  });
  const respJson: { text: string } = await response.json();
  console.log(respJson);

  const { text } = respJson;
  const selectedTemplate = parseSelectedTemplate(text);

  if (selectedTemplate) {
    return selectedTemplate;
  } else {
    console.log('No template selected, using blank template');

    return {
      template: 'blank',
      title: '',
    };
  }
};

const getGitHubRepoContent = async (repoName: string): Promise<{ name: string; path: string; content: string }[]> => {
  try {
    // Instead of directly fetching from GitHub, use our own API endpoint as a proxy
    const response = await fetch(`/api/github-template?repo=${encodeURIComponent(repoName)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Our API will return the files in the format we need
    const files = (await response.json()) as any;

    return files;
  } catch (error) {
    console.error('Error fetching release contents:', error);
    throw error;
  }
};

export async function getTemplates(
  templateName: string,
  title?: string,
  supabaseCredentials?: { supabaseUrl?: string; anonKey?: string },
  continuationPrompt?: string,
) {
  if (templateName === FULLSTACK_SAAS_TEMPLATE_NAME) {
    return buildTemplateArtifact(
      getFullstackSaasTemplateFiles(supabaseCredentials),
      FULLSTACK_SAAS_TEMPLATE_NAME,
      title,
      continuationPrompt,
    );
  }

  const template = STARTER_TEMPLATES.find((t) => t.name == templateName);

  if (!template) {
    return null;
  }

  const githubRepo = template.githubRepo;
  const files = await getGitHubRepoContent(githubRepo);

  let filteredFiles = files;

  /*
   * ignoring common unwanted files
   * exclude    .git
   */
  filteredFiles = filteredFiles.filter((x) => x.path.startsWith('.git') == false);

  /*
   * exclude    lock files
   * WE NOW INCLUDE LOCK FILES FOR IMPROVED INSTALL TIMES
   */
  {
    /*
     *const comminLockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
     *filteredFiles = filteredFiles.filter((x) => comminLockFiles.includes(x.name) == false);
     */
  }

  // exclude    .bolt
  filteredFiles = filteredFiles.filter((x) => x.path.startsWith('.bolt') == false);

  // check for ignore file in .bolt folder
  const templateIgnoreFile = files.find((x) => x.path.startsWith('.bolt') && x.name == 'ignore');

  const filesToImport = {
    files: filteredFiles,
    ignoreFile: [] as typeof filteredFiles,
  };

  if (templateIgnoreFile) {
    // redacting files specified in ignore file
    const ignorepatterns = templateIgnoreFile.content.split('\n').map((x) => x.trim());
    const ig = ignore().add(ignorepatterns);

    // filteredFiles = filteredFiles.filter(x => !ig.ignores(x.path))
    const ignoredFiles = filteredFiles.filter((x) => ig.ignores(x.path));

    filesToImport.files = filteredFiles;
    filesToImport.ignoreFile = ignoredFiles;
  }

  const assistantMessage = `
Bolt is initializing your project with the required files using the ${template.name} template.
<boltArtifact id="imported-files" title="${title || 'Create initial files'}" type="bundled">
${filesToImport.files
  .map(
    (file) =>
      `<boltAction type="file" filePath="${file.path}">
${file.content}
</boltAction>`,
  )
  .join('\n')}
</boltArtifact>
`;
  let userMessage = ``;
  const templatePromptFile = files.filter((x) => x.path.startsWith('.bolt')).find((x) => x.name == 'prompt');

  if (templatePromptFile) {
    userMessage = `
TEMPLATE INSTRUCTIONS:
${templatePromptFile.content}

---
`;
  }

  if (filesToImport.ignoreFile.length > 0) {
    userMessage =
      userMessage +
      `
STRICT FILE ACCESS RULES - READ CAREFULLY:

The following files are READ-ONLY and must never be modified:
${filesToImport.ignoreFile.map((file) => `- ${file.path}`).join('\n')}

Permitted actions:
✓ Import these files as dependencies
✓ Read from these files
✓ Reference these files

Strictly forbidden actions:
❌ Modify any content within these files
❌ Delete these files
❌ Rename these files
❌ Move these files
❌ Create new versions of these files
❌ Suggest changes to these files

Any attempt to modify these protected files will result in immediate termination of the operation.

If you need to make changes to functionality, create new files instead of modifying the protected ones listed above.
---
`;
  }

  userMessage += `
---
Template import is complete.
---
${
  continuationPrompt
    ? `IMPLEMENT THIS FULL SPECIFICATION NOW:\n\n${continuationPrompt}\n\n`
    : 'Now implement my original request in full.\n\n'
}
CRITICAL: Replace any placeholder dashboard copy with the complete app UI.
Run \`npm install && npm run dev\` if dependencies are not installed yet.
`;

  return {
    assistantMessage,
    userMessage,
  };
}
