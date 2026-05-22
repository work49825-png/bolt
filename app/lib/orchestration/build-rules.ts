import { stripIndents } from '~/utils/stripIndent';

/** Shared rules: orchestration and codegen must implement the user's app, not a hardcoded example. */
export const ORCHESTRATION_USER_APP_RULES = stripIndents`
  USER APP FIDELITY (mandatory):
  - Build ONLY the application described in the user's message and in [ORCHESTRATED BUILD] when present.
  - NEVER substitute a different app type (e.g. do NOT default to a todo list, task manager, or generic demo) unless the user explicitly requested that.
  - Documentation examples (todo, booking, CRM, etc.) are illustrations only — they are NOT templates or defaults for your output.
  - Infer entities, pages, labels, and workflows from the user's actual request; implement them completely.
  - Do not ship placeholder main screens, stub CRUD, or copy like "extend this dashboard" — deliver the full app the user asked for.
`;
