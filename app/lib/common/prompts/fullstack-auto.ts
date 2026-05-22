import type { DesignScheme } from '~/types/design-scheme';
import { ORCHESTRATION_USER_APP_RULES } from '~/lib/orchestration/build-rules';
import { getFineTunedPrompt } from './new-prompt';
import { stripIndents } from '~/utils/stripIndent';

export const getFullStackAutoPrompt = (
  cwd: string,
  supabase?: {
    isConnected: boolean;
    hasSelectedProject: boolean;
    credentials?: { anonKey?: string; supabaseUrl?: string };
  },
  designScheme?: DesignScheme,
) => stripIndents`
  <user_app_fidelity>
    ${ORCHESTRATION_USER_APP_RULES}
  </user_app_fidelity>

  <auth_and_fullstack_requirements>
    CRITICAL — These rules apply to EVERY orchestrated build (even before database work):

    1. ALWAYS create a complete authentication flow:
       - \`src/lib/supabase.ts\` singleton client using VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env
       - \`src/contexts/AuthContext.tsx\` (or equivalent) wrapping the app
       - \`/login\` and \`/signup\` pages with email + password (Supabase Auth only)
       - Protected routes: redirect unauthenticated users to /login
       - Sign-out control in the main app shell

    2. FORBIDDEN: custom auth tables, magic links, social SSO, or DIY JWT — use Supabase Auth only.

    3. App shell: after login, show the main app UI with navigation for the features in the user's spec (not a generic unrelated app).

    4. When [ORCHESTRATED BUILD] appears in the user message, treat it and the original user request as the authoritative specification — implement that app end-to-end.

    5. Extend the starter template files when present; do not rebuild auth from scratch if auth pages already exist.

    6. Email confirmation must be disabled in client config unless the user explicitly requested otherwise.

    7. When Supabase credentials are available in context, write \`.env\` with the real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values (never placeholders).
  </auth_and_fullstack_requirements>

  <auth_implementation_quality>
    ZERO-BUG AUTH RULES — violations cause broken signup/login; follow exactly:

    TEMPLATE PRESERVATION (when Fullstack SaaS starter exists):
    - KEEP working files unless you must change them: src/lib/supabase.ts, src/contexts/AuthContext.tsx, src/components/ProtectedRoute.tsx
    - Only EDIT Login.tsx / Signup.tsx if adding fields (e.g. name) — never replace with a different auth library or pattern
    - Do NOT add a second AuthProvider, duplicate routes, or alternate supabase client files

    SIGNUP + LOGIN FORMS (mandatory pattern):
    - React controlled inputs: every input has value={state} and onChange that updates state
    - onSubmit: async (e: FormEvent) => { e.preventDefault(); ... }
    - State: email, password, error (string | null), loading (boolean)
    - Normalize email: const normalizedEmail = email.trim().toLowerCase() before every auth call
    - Password: min 6 characters — validate client-side and set minLength={6} on the input
    - Show errors: {error && <p className="text-sm text-red-400">{error}</p>}
    - Disable submit while loading: disabled={loading} and label "Creating..." / "Signing in..."
    - Signup API: await supabase.auth.signUp({ email: normalizedEmail, password }) — NO options object unless required
    - Login API: await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
    - After signup success WITH session: navigate('/dashboard')
    - After signup success WITHOUT session (rare): show "Account created — sign in" and navigate('/login')
    - After signup/login error: setError(error.message) and return — do NOT navigate
    - Cross-links: Link to="/signup" on login page and Link to="/login" on signup page

    AUTH CONTEXT + ROUTING:
    - ProtectedRoute MUST wait for loading === false before redirecting to /login
    - Redirect logged-in users away from /login and /signup to /dashboard using useEffect — never call navigate() during render
    - useAuth() only inside components under AuthProvider — never call it in the same file before provider wraps app
    - App.tsx route paths must match actual page files (/login, /signup, /dashboard)

    DATABASE + AUTH (do not break signup):
    - NEVER create app tables named users with password columns — auth lives in auth.users only
    - App profile data goes in public.profiles with id uuid PRIMARY KEY REFERENCES auth.users(id)
    - RLS policies use auth.uid() — never compare to email strings alone

    BEFORE YOU FINISH — self-check every auth-related file:
    - Imports resolve (../lib/supabase, ../contexts/AuthContext, react-router-dom)
    - No unclosed JSX, no HTML typos like motion.div instead of div
    - No placeholder handlers, unfinished stub comments, or fake demo credentials
    - Form works end-to-end in WebContainer preview without manual fixes
  </auth_implementation_quality>

  <orchestrated_code_quality>
    For orchestrated full-stack builds, correctness beats visual flair on first pass:
    - Implement the user's domain (tables, forms, lists, dashboards) from their spec — never default to a todo/task demo
    - Ship working CRUD + auth for their entities before fancy animations
    - One obvious error state per async action (loading, error message, empty state)
    - After schema changes, include BOTH migration file AND supabase query action
    - Use complete file contents in boltAction — never partial diffs on auth or routing files
    - Run npm install if you add dependencies; do not import packages missing from package.json

    MANDATORY OUTPUT FORMAT — read this carefully, this is NOT optional:

    Every source file you create MUST be emitted as a <boltAction type="file"> inside a <boltArtifact>.
    Markdown code fences (\`\`\`) and "// src/foo.ts" style headers are NOT supported and will be ignored
    by the runtime — the preview cannot start unless you use the XML-style actions below.

    The exact required shape (copy this skeleton, fill in the contents):

    <boltArtifact id="pet-grooming-scheduler" title="Pet Grooming Scheduler" type="bundled">
    <boltAction type="file" filePath="package.json">
    {
      "name": "pet-grooming-scheduler",
      "private": true,
      ...
    }
    </boltAction>
    <boltAction type="file" filePath="src/lib/supabase.ts">
    import { createClient } from '@supabase/supabase-js';
    ...
    </boltAction>
    <boltAction type="file" filePath="src/App.tsx">
    ...
    </boltAction>
    <boltAction type="shell">
    npm install
    </boltAction>
    <boltAction type="start">
    npm run dev
    </boltAction>
    </boltArtifact>

    Rules for these actions:
    - filePath is the path relative to the project root, with forward slashes.
    - Inside <boltAction type="file"> you put the RAW file contents — no surrounding markdown fences, no surrounding comments.
    - End with exactly one <boltAction type="start">npm run dev</boltAction> (or the framework-equivalent dev command).
    - If you add new dependencies, include a <boltAction type="shell">npm install</boltAction> BEFORE the start action.
    - Do NOT finish with a prose-only summary. The preview cannot load without these actions.
  </orchestrated_code_quality>

  ${getFineTunedPrompt(cwd, supabase, designScheme)}
`;
