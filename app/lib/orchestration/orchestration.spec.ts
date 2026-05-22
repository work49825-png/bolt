import { describe, expect, it } from 'vitest';
import { composeOrchestratedPrompt } from './prompt-composer';
import { getFullstackSaasTemplateFiles } from './fullstack-saas-template';
import { buildSpecSchema, createFallbackBuildSpec } from './types';
import { SYSTEM_CAPABILITY_GROUPS } from './system-capabilities';
import { resolveTemplateFromBuildSpec } from '~/utils/selectStarterTemplate';
import { FULLSTACK_SAAS_TEMPLATE_NAME } from './fullstack-saas-template';
import { contentHasOrchestratedBuild } from './build-message-utils';
import { assistantMessageHasProjectArtifacts, assistantMessageHasStartAction } from './finalize-build';

describe('orchestration', () => {
  it('createFallbackBuildSpec returns valid BuildSpec', () => {
    const spec = createFallbackBuildSpec('team todo app');
    expect(buildSpecSchema.safeParse(spec).success).toBe(true);
    expect(spec.requiresAuth).toBe(true);
    expect(spec.requiresDatabase).toBe(true);
    expect(spec.preferredTemplate).toBe('Fullstack SaaS');
    expect(spec.title).toBe('team todo app');
    expect(spec.expandedPrompt).toContain('team todo app');
    expect(spec.expandedPrompt).toContain('Do not substitute a todo app');
  });

  it('createFallbackBuildSpec uses user message for non-todo apps', () => {
    const spec = createFallbackBuildSpec('inventory tracker for a bike shop');
    expect(spec.title).toContain('inventory tracker');
    expect(spec.expandedPrompt).toContain('inventory tracker for a bike shop');
  });

  it('composeOrchestratedPrompt includes user message and orchestration header', () => {
    const spec = createFallbackBuildSpec('client portal for invoices');
    const out = composeOrchestratedPrompt(spec, 'client portal for invoices');
    expect(out).toContain('[ORCHESTRATED BUILD');
    expect(out).toContain('client portal for invoices');
    expect(out).toContain(spec.title);
    expect(out).toContain(spec.stack.styling);
    expect(out).toContain('USER APP FIDELITY');
    expect(out).toContain('not a different app');
  });

  it('contentHasOrchestratedBuild detects orchestration marker', () => {
    expect(contentHasOrchestratedBuild('[ORCHESTRATED BUILD — follow this specification exactly]')).toBe(true);
    expect(contentHasOrchestratedBuild('plain todo app')).toBe(false);
  });

  it('resolveTemplateFromBuildSpec picks Fullstack SaaS for auth+db apps when Supabase is connected', () => {
    const spec = createFallbackBuildSpec('crm');
    const result = resolveTemplateFromBuildSpec(spec, { supabaseReady: true });
    expect(result).toEqual({ template: FULLSTACK_SAAS_TEMPLATE_NAME, title: spec.title });
  });

  it('resolveTemplateFromBuildSpec falls back when Supabase is not connected so the preview is not blank', () => {
    const spec = createFallbackBuildSpec('crm');

    /*
     * No supabaseReady flag — and the fallback spec sets preferredTemplate = 'Fullstack SaaS',
     * which is rejected by STARTER_TEMPLATES so we return null and let the LLM build from scratch.
     */
    const result = resolveTemplateFromBuildSpec({ ...spec, preferredTemplate: undefined });
    expect(result).toBeNull();
  });

  it('resolveTemplateFromBuildSpec returns null for landing-only spec', () => {
    const spec = createFallbackBuildSpec('landing');
    const landing = {
      ...spec,
      requiresAuth: false,
      requiresDatabase: false,
      preferredTemplate: undefined,
    };
    expect(resolveTemplateFromBuildSpec(landing, { supabaseReady: true })).toBeNull();
  });

  it('composeOrchestratedPrompt removes Supabase requirements when Supabase is not connected', () => {
    const spec = createFallbackBuildSpec('team todo app');
    const out = composeOrchestratedPrompt(spec, 'team todo app', { supabaseReady: false });
    expect(out).toContain('SUPABASE IS NOT CONNECTED FOR THIS BUILD');
    expect(out).toContain('Do NOT import');
    expect(out).not.toMatch(/Authentication: required —/);
  });

  it('getFullstackSaasTemplateFiles injects Supabase credentials into .env', () => {
    const files = getFullstackSaasTemplateFiles({
      supabaseUrl: 'https://example.supabase.co',
      anonKey: 'test-anon-key',
    });
    const env = files.find((f) => f.path === '.env');
    expect(env?.content).toContain('https://example.supabase.co');
    expect(env?.content).toContain('test-anon-key');
  });

  it('getFullstackSaasTemplateFiles leaves placeholders without credentials', () => {
    const files = getFullstackSaasTemplateFiles();
    const env = files.find((f) => f.path === '.env');
    expect(env?.content).toMatch(/VITE_SUPABASE_URL=\s*$/m);
  });

  it('detects missing project artifacts and start actions in assistant messages', () => {
    expect(assistantMessageHasProjectArtifacts('<boltAction type="file" filePath="a.ts">x</boltAction>')).toBe(true);
    expect(assistantMessageHasProjectArtifacts('The application is ready to run.')).toBe(false);
    expect(assistantMessageHasStartAction('<boltAction type="start">npm run dev</boltAction>')).toBe(true);
    expect(assistantMessageHasStartAction('npm run dev')).toBe(false);
  });

  it('system capability groups are non-empty', () => {
    expect(SYSTEM_CAPABILITY_GROUPS.worksWell.items.length).toBeGreaterThan(0);
    expect(SYSTEM_CAPABILITY_GROUPS.poorFit.items.length).toBeGreaterThan(0);
  });
});
