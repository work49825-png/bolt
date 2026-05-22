import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { getApiKeysFromCookie } from '~/lib/api/cookies';
import { createScopedLogger } from '~/utils/logger';
import { getEnvValue } from '~/lib/.server/get-server-env';

const logger = createScopedLogger('api.supabase.create-project');

function getToken(request: Request, context: ActionFunctionArgs['context']) {
  const authHeader = request.headers.get('Authorization');
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);

  return headerToken || apiKeys.VITE_SUPABASE_ACCESS_TOKEN || getEnvValue(context, 'VITE_SUPABASE_ACCESS_TOKEN');
}

export async function action({ context, request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  const token = getToken(request, context);

  if (!token) {
    return json({ error: 'Supabase access token required' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { name?: string; organizationId?: string; region?: string };
    const projectName = body.name || `bolt-app-${Date.now().toString(36)}`;

    let organizationId = body.organizationId;

    if (!organizationId) {
      const orgResponse = await fetch('https://api.supabase.com/v1/organizations', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (orgResponse.ok) {
        const orgs = (await orgResponse.json()) as Array<{ id: string }>;
        organizationId = orgs[0]?.id;
      } else {
        const projectsResponse = await fetch('https://api.supabase.com/v1/projects', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (projectsResponse.ok) {
          const projects = (await projectsResponse.json()) as Array<{ organization_id: string }>;
          organizationId = projects[0]?.organization_id;
        }
      }
    }

    if (!organizationId) {
      return json(
        { error: 'Could not determine Supabase organization. Create a project manually once.' },
        { status: 400 },
      );
    }

    const dbPass = crypto.randomUUID().replace(/-/g, '').slice(0, 16) + 'Aa1!';

    const createResponse = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organization_id: organizationId,
        name: projectName,
        region: body.region || 'us-east-1',
        db_pass: dbPass,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      logger.error('Create project failed', errorText);

      return json({ error: `Failed to create project: ${errorText}` }, { status: createResponse.status });
    }

    const project = (await createResponse.json()) as { id: string; name: string; region: string };

    return json({
      project: {
        id: project.id,
        name: project.name,
        region: project.region,
        organization_id: organizationId,
      },
    });
  } catch (error) {
    logger.error('create-project error', error);
    return json({ error: error instanceof Error ? error.message : 'Failed to create project' }, { status: 500 });
  }
}
