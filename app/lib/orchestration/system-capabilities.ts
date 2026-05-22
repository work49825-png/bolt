export interface CapabilityGroup {
  id: string;
  title: string;
  description: string;
  items: string[];
  examples?: string[];
}

export const SYSTEM_CAPABILITY_GROUPS: {
  worksWell: CapabilityGroup;
  worksWithCaveats: CapabilityGroup;
  requirements: CapabilityGroup;
  poorFit: CapabilityGroup;
} = {
  worksWell: {
    id: 'works-well',
    title: 'Works best',
    description: 'Short prompts in Build mode with full-stack orchestration on',
    items: [
      'SaaS and team apps with login, signup, and a protected dashboard',
      'Todo, booking, CRM-lite, inventory, and internal tools with Postgres data',
      'React + Vite + TypeScript UIs with Supabase Auth (email/password) and RLS',
      'Apps that extend the Fullstack SaaS starter (auth shell + your features)',
    ],
    examples: ['team task board', 'client portal with login', 'booking dashboard for my shop'],
  },
  worksWithCaveats: {
    id: 'caveats',
    title: 'Possible, but less automatic',
    description: 'Turn off full-stack orchestration or expect more manual steps',
    items: [
      'Marketing / landing pages with no login or database',
      'Games, canvas demos, and single-file scripts',
      'Astro, Next.js, or non-Vite stacks (other starter templates)',
      'Discuss mode for questions, refactors, and planning without codegen',
    ],
    examples: ['space invaders game', 'landing page only', 'explain this React hook'],
  },
  requirements: {
    id: 'requirements',
    title: 'What you need configured',
    description: 'For the smoothest full-stack path',
    items: [
      'An LLM API key (e.g. OpenAI) for refine + code generation',
      'VITE_SUPABASE_ACCESS_TOKEN to auto-connect, create/select a project, and run SQL',
      'Supabase for hosted database and auth (runs in the cloud, not inside the browser sandbox)',
    ],
  },
  poorFit: {
    id: 'poor-fit',
    title: 'Not a good fit today',
    description: 'Bolt runs in a browser sandbox and targets hosted Supabase',
    items: [
      'Custom auth servers, magic-link-only flows, or social login without extra setup',
      'Native iOS/Android apps, desktop apps, or arbitrary self-hosted backends',
      'Heavy real-time (video, live collaboration), blockchain, or enterprise compliance out of the box',
      'Long-running servers, cron workers, or native binaries inside WebContainer',
    ],
  },
};

export const ORCHESTRATION_CAPABILITY_NOTE =
  'With full-stack orchestration enabled, your first message is expanded into a full spec, Supabase is prepared when possible, and codegen uses the Full-Stack Auto prompt.';

export const ORCHESTRATION_OFF_CAPABILITY_NOTE =
  'With orchestration off, Bolt behaves like classic bolt.diy: you write richer prompts and connect Supabase manually.';
