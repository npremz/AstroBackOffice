import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// Module Definitions (e.g., "Services", "Blog")
export const collections = sqliteTable('collections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').unique().notNull(),
  schema: text('schema', { mode: 'json' }).notNull().$type<Array<{
    label: string;
    type: string;
    key: string;
    required: boolean;
  }>>(),
});

// SEO metadata type
export interface SeoMetadata {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
}

// Production Content (Publicly visible)
export const entries = sqliteTable('entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  collectionId: integer('collection_id').notNull().references(() => collections.id),
  slug: text('slug').unique().notNull(),
  data: text('data', { mode: 'json' }).notNull().$type<Record<string, any>>(),
  template: text('template').notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
  // SEO fields
  seo: text('seo', { mode: 'json' }).$type<SeoMetadata>(),
  // Soft delete
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  // Scheduled publishing - if set, entry won't be visible until this date
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
});

// Drafts & History (Admin workspace)
export const revisions = sqliteTable('revisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').notNull().references(() => entries.id),
  data: text('data', { mode: 'json' }).notNull().$type<Record<string, any>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  status: text('status').notNull(), // 'draft', 'archived'
});

// Content Modules (Single-use content for fixed pages like About, Hero, Contact)
export const contentModules = sqliteTable('content_modules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  schema: text('schema', { mode: 'json' }).notNull().$type<Array<{
    label: string;
    type: string;
    key: string;
    required: boolean;
  }>>(),
  data: text('data', { mode: 'json' }).notNull().$type<Record<string, any>>(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Media Library (Uploaded images and files)
export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  url: text('url').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(), // in bytes
  width: integer('width'),
  height: integer('height'),
  alt: text('alt'),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull(),
});

// Files Library (Documents: PDF, Word, Excel, etc.)
export const files = sqliteTable('files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  url: text('url').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(), // in bytes
  description: text('description'),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull(),
});

// Users (Admin accounts)
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  role: text('role').notNull().default('editor'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
});

// Sessions (login tokens)
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  userAgent: text('user_agent'),
  ip: text('ip'),
});

// Invitations
export const invitations = sqliteTable('invitations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  role: text('role').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  invitedBy: integer('invited_by').references(() => users.id),
  acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  revoked: integer('revoked', { mode: 'boolean' }).notNull().default(false),
});

// Audit Logs (tracks who modified what and when)
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(), // CREATE, UPDATE, DELETE, PUBLISH, LOGIN, LOGOUT
  resourceType: text('resource_type').notNull(), // Entry, Collection, User, Media, ContentModule, Session
  resourceId: integer('resource_id'),
  resourceName: text('resource_name'), // slug, email, filename for readability
  changes: text('changes', { mode: 'json' }).$type<{
    before?: Record<string, any>;
    after?: Record<string, any>;
  }>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  status: text('status').notNull().default('SUCCESS'), // SUCCESS, FAILED
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
