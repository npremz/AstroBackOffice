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

// Production Content (Publicly visible)
export const entries = sqliteTable('entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  collectionId: integer('collection_id').notNull().references(() => collections.id),
  slug: text('slug').unique().notNull(),
  data: text('data', { mode: 'json' }).notNull().$type<Record<string, any>>(),
  template: text('template').notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
});

// Drafts & History (Admin workspace)
export const revisions = sqliteTable('revisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').notNull().references(() => entries.id),
  data: text('data', { mode: 'json' }).notNull().$type<Record<string, any>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  status: text('status').notNull(), // 'draft', 'archived'
});
