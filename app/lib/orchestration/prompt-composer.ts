import type { BuildSpec } from './types';
import { ORCHESTRATION_USER_APP_RULES } from './build-rules';

export interface ComposeOrchestratedPromptOptions {
  /** True when a Supabase project is connected AND credentials are available. */
  supabaseReady?: boolean;
}

export function composeOrchestratedPrompt(
  buildSpec: BuildSpec,
  originalUserMessage: string,
  options: ComposeOrchestratedPromptOptions = {},
): string {
  const { supabaseReady = false } = options;

  /*
   * Effective requirements: if Supabase isn't connected we cannot deliver real auth/db,
   * so degrade gracefully to a frontend-only app instead of generating code that crashes
   * the preview with empty VITE_SUPABASE_* env vars.
   */
  const effectiveAuth = buildSpec.requiresAuth && supabaseReady;
  const effectiveDb = buildSpec.requiresDatabase && supabaseReady;

  const entitiesSummary =
    buildSpec.entities.length > 0
      ? buildSpec.entities.map((e) => `${e.name} (${e.columns.map((c) => c.name).join(', ')})`).join('; ')
      : 'profiles and app-specific tables as needed';

  const authLine = effectiveAuth
    ? 'required — Supabase email/password sign-up and sign-in pages'
    : buildSpec.requiresAuth
      ? 'NOT available this run — Supabase is not connected. Skip login/signup. Treat the user as already signed in (no protected routes).'
      : 'not required';

  const dbLine = effectiveDb
    ? `required — Supabase with tables: ${entitiesSummary}`
    : buildSpec.requiresDatabase
      ? 'NOT available this run — Supabase is not connected. Use in-memory React state (or localStorage for persistence) instead of a database. Do NOT import @supabase/supabase-js. Do NOT generate migration files.'
      : 'not required';

  const supabaseFallbackBlock = !supabaseReady
    ? `

SUPABASE IS NOT CONNECTED FOR THIS BUILD:
- Do NOT add @supabase/supabase-js to dependencies.
- Do NOT import 'supabase' anywhere.
- Do NOT create src/lib/supabase.ts, AuthContext, ProtectedRoute, Login, or Signup.
- Do NOT emit <boltAction type="supabase" operation="migration"|"query"> actions.
- Persist data in component state or localStorage only.
- The preview MUST render content immediately — no auth gating, no infinite "Loading..." screens.`
    : '';

  const qualityBar = supabaseReady
    ? `QUALITY BAR — auth must work on first run:
- If Fullstack SaaS starter files already exist in the project, extend them; do not replace Login, Signup, AuthContext, or supabase.ts with new implementations
- Signup and login forms must use controlled inputs, e.preventDefault(), trim/lowercase email, loading + error UI, and supabase.auth.signUp / signInWithPassword only
- No custom users table with passwords; profiles table links to auth.users(id)
- Verify imports and routes compile before finishing
- End with boltArtifact file actions for every source file, then shell install if needed, then <boltAction type="start">npm run dev</boltAction> — not a text-only summary`
    : `QUALITY BAR — preview must render on first run:
- The app MUST mount and show real content without any backend calls.
- No imports of @supabase/supabase-js, no env vars required to render.
- Verify imports and routes compile before finishing.
- End with boltArtifact file actions for every source file, then shell install if needed, then <boltAction type="start">npm run dev</boltAction> — not a text-only summary.`;

  return `[ORCHESTRATED BUILD — follow this specification exactly]

${ORCHESTRATION_USER_APP_RULES}

App title: ${buildSpec.title}
App type: ${buildSpec.appType}
Authentication: ${authLine}
Database: ${dbLine}
Pages to implement: ${buildSpec.pages.join(', ')}
Stack: ${buildSpec.stack.frontend}, ${buildSpec.stack.backend}, ${buildSpec.stack.styling}${supabaseFallbackBlock}

Detailed requirements:
${buildSpec.expandedPrompt}

Assumptions made (do not ask the user to confirm):
${buildSpec.assumptions.map((a) => `- ${a}`).join('\n')}

Original user request: "${originalUserMessage}"

Implement the complete application in one cohesive pass: UI${supabaseReady ? ', Supabase client, auth flow, migrations with RLS,' : ','} and working preview.
Build "${buildSpec.title}" as the user described — not a different app (e.g. not a todo list unless they asked for tasks/todos).
Ship real screens for every page listed above with domain-specific data and actions — never placeholder copy like "Extend this dashboard with your app features".

${qualityBar}`;
}
