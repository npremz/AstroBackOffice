import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/auth';
import { getAuditLogs, type AuditLogFilters } from '@/lib/audit';

export const GET: APIRoute = async ({ url, cookies }) => {
  const auth = await requireAuth(cookies, ['super_admin']);
  if ('response' in auth) return auth.response;

  try {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '50', 10), 100);

    const filters: AuditLogFilters = {};

    const userId = url.searchParams.get('userId');
    if (userId) filters.userId = parseInt(userId, 10);

    const action = url.searchParams.get('action');
    if (action) filters.action = action as AuditLogFilters['action'];

    const resourceType = url.searchParams.get('resourceType');
    if (resourceType) filters.resourceType = resourceType as AuditLogFilters['resourceType'];

    const resourceId = url.searchParams.get('resourceId');
    if (resourceId) filters.resourceId = parseInt(resourceId, 10);

    const search = url.searchParams.get('search');
    if (search) filters.search = search;

    const status = url.searchParams.get('status');
    if (status) filters.status = status as 'SUCCESS' | 'FAILED';

    const startDate = url.searchParams.get('startDate');
    if (startDate) filters.startDate = new Date(startDate);

    const endDate = url.searchParams.get('endDate');
    if (endDate) filters.endDate = new Date(endDate);

    const result = await getAuditLogs(filters, page, pageSize);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch audit logs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
