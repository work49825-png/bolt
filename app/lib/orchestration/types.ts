import { z } from 'zod';

export const entityColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
});

export const entitySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  columns: z.array(entityColumnSchema),
});

export const buildSpecSchema = z.object({
  title: z.string(),
  appType: z.enum(['saas', 'dashboard', 'crud', 'landing', 'other']),
  requiresAuth: z.boolean(),
  requiresDatabase: z.boolean(),
  entities: z.array(entitySchema),
  pages: z.array(z.string()),
  stack: z.object({
    frontend: z.string(),
    backend: z.string(),
    styling: z.string(),
  }),
  expandedPrompt: z.string(),
  assumptions: z.array(z.string()),
  preferredTemplate: z.string().optional(),
});

export type BuildSpec = z.infer<typeof buildSpecSchema>;

export interface SupabaseChatContext {
  isConnected: boolean;
  hasSelectedProject: boolean;
  credentials?: {
    anonKey?: string;
    supabaseUrl?: string;
  };
  projectId?: string;
}

function fallbackTitleFromMessage(userMessage: string): string {
  const trimmed = userMessage.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return 'User Application';
  }

  return trimmed.length > 72 ? `${trimmed.slice(0, 69)}...` : trimmed;
}

export function createFallbackBuildSpec(userMessage: string): BuildSpec {
  const title = fallbackTitleFromMessage(userMessage);

  return {
    title,
    appType: 'saas',
    requiresAuth: true,
    requiresDatabase: true,
    entities: [
      {
        name: 'profiles',
        description: 'User profiles linked to auth',
        columns: [
          { name: 'id', type: 'uuid', description: 'references auth.users' },
          { name: 'email', type: 'text' },
          { name: 'created_at', type: 'timestamptz' },
        ],
      },
    ],
    pages: ['login', 'signup', 'main app screens as required by the user request'],
    stack: {
      frontend: 'React + Vite + TypeScript',
      backend: 'Supabase',
      styling: 'Tailwind CSS',
    },
    expandedPrompt: `Implement exactly what the user asked for: "${userMessage}". Do not substitute a todo app, task manager, or unrelated demo. Add domain-specific tables, pages, and UI for this request. Include Supabase email/password auth, protected routes, RLS, and a complete working preview.`,
    assumptions: [
      'Using Supabase for database and authentication',
      'Email/password auth with confirmation disabled',
      'App features and schema follow the user message above, not a hardcoded example',
    ],
    preferredTemplate: 'Fullstack SaaS',
  };
}
