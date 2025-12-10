import { db } from '@/db';
import { auditLogs, users } from '@/db/schema';
import { desc, eq, and, gte, lte, like, or, sql } from 'drizzle-orm';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'LOGIN' | 'LOGOUT' | 'INVITE';
export type ResourceType = 'Entry' | 'Collection' | 'User' | 'Media' | 'ContentModule' | 'Session' | 'Invitation';

export interface AuditContext {
  userId: number | null;
  userEmail: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogEntry {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: number | null;
  resourceName?: string | null;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  status?: 'SUCCESS' | 'FAILED';
  errorMessage?: string | null;
}

export async function logAudit(
  context: AuditContext,
  entry: AuditLogEntry
) {
  try {
    await db.insert(auditLogs).values({
      userId: context.userId,
      userEmail: context.userEmail,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      resourceName: entry.resourceName ?? null,
      changes: entry.changes ?? null,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
      status: entry.status ?? 'SUCCESS',
      errorMessage: entry.errorMessage ?? null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export function createAuditContext(
  user: { id: number; email: string } | null,
  request: Request
): AuditContext {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || null;
  const userAgent = request.headers.get('user-agent') || null;

  return {
    userId: user?.id ?? null,
    userEmail: user?.email ?? 'anonymous',
    ipAddress: ip,
    userAgent,
  };
}

export function computeChanges(
  before: Record<string, any> | null,
  after: Record<string, any> | null
): { before?: Record<string, any>; after?: Record<string, any> } | undefined {
  if (!before && !after) return undefined;

  const changes: { before?: Record<string, any>; after?: Record<string, any> } = {};

  if (before && after) {
    const changedBefore: Record<string, any> = {};
    const changedAfter: Record<string, any> = {};

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of allKeys) {
      const beforeVal = JSON.stringify(before[key]);
      const afterVal = JSON.stringify(after[key]);
      if (beforeVal !== afterVal) {
        changedBefore[key] = before[key];
        changedAfter[key] = after[key];
      }
    }

    if (Object.keys(changedBefore).length > 0) {
      changes.before = changedBefore;
      changes.after = changedAfter;
    }
  } else if (before) {
    changes.before = before;
  } else if (after) {
    changes.after = after;
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}

export interface AuditLogFilters {
  userId?: number;
  action?: AuditAction;
  resourceType?: ResourceType;
  resourceId?: number;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'SUCCESS' | 'FAILED';
}

export interface PaginatedAuditLogs {
  logs: Array<{
    id: number;
    userId: number | null;
    userEmail: string;
    userName: string | null;
    action: string;
    resourceType: string;
    resourceId: number | null;
    resourceName: string | null;
    changes: { before?: Record<string, any>; after?: Record<string, any> } | null;
    ipAddress: string | null;
    userAgent: string | null;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getAuditLogs(
  filters: AuditLogFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<PaginatedAuditLogs> {
  const conditions = [];

  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters.resourceType) {
    conditions.push(eq(auditLogs.resourceType, filters.resourceType));
  }
  if (filters.resourceId) {
    conditions.push(eq(auditLogs.resourceId, filters.resourceId));
  }
  if (filters.status) {
    conditions.push(eq(auditLogs.status, filters.status));
  }
  if (filters.startDate) {
    conditions.push(gte(auditLogs.createdAt, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(auditLogs.createdAt, filters.endDate));
  }
  if (filters.search) {
    conditions.push(
      or(
        like(auditLogs.userEmail, `%${filters.search}%`),
        like(auditLogs.resourceName, `%${filters.search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(whereClause);

  const total = countResult?.count ?? 0;
  const offset = (page - 1) * pageSize;

  const logs = await db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userEmail: auditLogs.userEmail,
      userName: users.name,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      resourceName: auditLogs.resourceName,
      changes: auditLogs.changes,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      status: auditLogs.status,
      errorMessage: auditLogs.errorMessage,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
