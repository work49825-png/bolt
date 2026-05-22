import { toast } from 'react-toastify';
import {
  fetchProjectApiKeys,
  fetchSupabaseStats,
  initializeSupabaseConnection,
  supabaseConnection,
  updateSupabaseConnection,
} from '~/lib/stores/supabase';
import type { BuildSpec, SupabaseChatContext } from './types';
import { BASELINE_MIGRATION_SQL, baselineMigrationStorageKey } from './baseline-migration';

async function runBaselineMigration(projectId: string, token: string): Promise<void> {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const key = baselineMigrationStorageKey(projectId);

  if (localStorage.getItem(key) === 'done') {
    return;
  }

  const response = await fetch('/api/supabase/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      projectId,
      query: BASELINE_MIGRATION_SQL,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(errorData.error?.message || 'Baseline migration failed');
  }

  localStorage.setItem(key, 'done');
}

async function ensureProjectSelected(token: string, chatId?: string): Promise<string | undefined> {
  const state = supabaseConnection.get();

  if (state.selectedProjectId) {
    return state.selectedProjectId;
  }

  if (chatId && typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(`supabase-project-${chatId}`);

    if (saved) {
      updateSupabaseConnection({ selectedProjectId: saved });
      await fetchProjectApiKeys(saved, token);

      return saved;
    }
  }

  const projects = state.stats?.projects;

  if (projects && projects.length > 0) {
    const projectId = projects[0].id;
    updateSupabaseConnection({ selectedProjectId: projectId });
    await fetchProjectApiKeys(projectId, token);

    if (chatId && typeof localStorage !== 'undefined') {
      localStorage.setItem(`supabase-project-${chatId}`, projectId);
    }

    return projectId;
  }

  const createResponse = await fetch('/api/supabase/create-project', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: `bolt-app-${Date.now().toString(36)}`,
    }),
  });

  if (!createResponse.ok) {
    const err = (await createResponse.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'Failed to create Supabase project');
  }

  const { project } = (await createResponse.json()) as { project: { id: string } };

  await fetchSupabaseStats(token);
  updateSupabaseConnection({ selectedProjectId: project.id });
  await fetchProjectApiKeys(project.id, token);

  if (chatId && typeof localStorage !== 'undefined') {
    localStorage.setItem(`supabase-project-${chatId}`, project.id);
  }

  return project.id;
}

export async function ensureBackendReady(options: {
  buildSpec: BuildSpec;
  chatId?: string;
}): Promise<SupabaseChatContext> {
  const { buildSpec, chatId } = options;

  if (!buildSpec.requiresDatabase) {
    return {
      isConnected: false,
      hasSelectedProject: false,
    };
  }

  initializeSupabaseConnection();

  let state = supabaseConnection.get();
  const token = state.token || import.meta.env.VITE_SUPABASE_ACCESS_TOKEN;

  if (!token) {
    toast.warn('Supabase token not configured. Connect Supabase in settings or add VITE_SUPABASE_ACCESS_TOKEN.');
    return {
      isConnected: false,
      hasSelectedProject: false,
    };
  }

  if (!state.user || !state.stats) {
    updateSupabaseConnection({ token });
    await fetchSupabaseStats(token);
    state = supabaseConnection.get();
  }

  const projectId = await ensureProjectSelected(token, chatId);

  if (!projectId) {
    return {
      isConnected: !!state.user,
      hasSelectedProject: false,
    };
  }

  state = supabaseConnection.get();

  if (!state.credentials?.anonKey) {
    await fetchProjectApiKeys(projectId, token);
    state = supabaseConnection.get();
  }

  try {
    await runBaselineMigration(projectId, token);
  } catch (error) {
    console.warn('Baseline migration skipped or failed:', error);
  }

  return {
    isConnected: true,
    hasSelectedProject: true,
    projectId,
    credentials: {
      supabaseUrl: state.credentials?.supabaseUrl,
      anonKey: state.credentials?.anonKey,
    },
  };
}
