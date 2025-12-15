import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../src/db';
import { entries, collections, revisions } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

// Mock auth
vi.mock('../src/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ user: { id: 1, email: 'admin@test.com', role: 'admin' } }),
}));

// Mock csrf
vi.mock('../src/lib/csrf', () => ({
  validateCsrf: vi.fn().mockReturnValue(true),
  csrfError: vi.fn().mockReturnValue(new Response(JSON.stringify({ error: 'Invalid CSRF token' }), { status: 403 })),
}));

// Mock audit
vi.mock('../src/lib/audit', () => ({
  createAuditContext: vi.fn().mockReturnValue({}),
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

describe('Entries Reorder', () => {
  let collectionId: number;
  let entryIds: number[] = [];

  beforeEach(async () => {
    // Clean up in correct order (revisions depend on entries)
    await db.delete(revisions);
    await db.delete(entries);
    await db.delete(collections);

    // Create test collection
    const [collection] = await db.insert(collections).values({
      slug: 'test-reorder-collection',
      schema: [{ label: 'Title', type: 'text', key: 'title', required: true }],
    }).returning();
    collectionId = collection.id;

    // Create test entries with initial order
    entryIds = [];
    for (let i = 0; i < 5; i++) {
      const [entry] = await db.insert(entries).values({
        collectionId,
        slug: `entry-${i}`,
        data: { title: `Entry ${i}` },
        template: 'default',
        publishedAt: new Date(),
        sortOrder: i,
      }).returning();
      entryIds.push(entry.id);
    }
  });

  afterEach(async () => {
    await db.delete(revisions);
    await db.delete(entries);
    await db.delete(collections);
  });

  describe('sortOrder field', () => {
    it('should store sortOrder on entries', async () => {
      const allEntries = await db.select().from(entries).where(eq(entries.collectionId, collectionId));
      
      expect(allEntries.length).toBe(5);
      allEntries.forEach((entry, index) => {
        expect(entry.sortOrder).toBe(index);
      });
    });

    it('should default sortOrder to 0 for new entries', async () => {
      const [newEntry] = await db.insert(entries).values({
        collectionId,
        slug: 'new-entry',
        data: { title: 'New Entry' },
        template: 'default',
        publishedAt: new Date(),
      }).returning();

      expect(newEntry.sortOrder).toBe(0);
    });

    it('should allow updating sortOrder', async () => {
      // Reverse the order
      for (let i = 0; i < entryIds.length; i++) {
        await db.update(entries)
          .set({ sortOrder: entryIds.length - 1 - i })
          .where(eq(entries.id, entryIds[i]));
      }

      const allEntries = await db.select()
        .from(entries)
        .where(eq(entries.collectionId, collectionId));

      // Entry 0 should now have sortOrder 4
      const entry0 = allEntries.find(e => e.id === entryIds[0]);
      expect(entry0?.sortOrder).toBe(4);

      // Entry 4 should now have sortOrder 0
      const entry4 = allEntries.find(e => e.id === entryIds[4]);
      expect(entry4?.sortOrder).toBe(0);
    });
  });

  describe('batch reorder operation', () => {
    it('should reorder multiple entries at once', async () => {
      // New order: 4, 2, 0, 3, 1
      const newOrder = [entryIds[4], entryIds[2], entryIds[0], entryIds[3], entryIds[1]];
      
      for (let i = 0; i < newOrder.length; i++) {
        await db.update(entries)
          .set({ sortOrder: i })
          .where(eq(entries.id, newOrder[i]));
      }

      const reorderedEntries = await db.select()
        .from(entries)
        .where(eq(entries.collectionId, collectionId));

      // Verify new positions
      expect(reorderedEntries.find(e => e.id === entryIds[4])?.sortOrder).toBe(0);
      expect(reorderedEntries.find(e => e.id === entryIds[2])?.sortOrder).toBe(1);
      expect(reorderedEntries.find(e => e.id === entryIds[0])?.sortOrder).toBe(2);
      expect(reorderedEntries.find(e => e.id === entryIds[3])?.sortOrder).toBe(3);
      expect(reorderedEntries.find(e => e.id === entryIds[1])?.sortOrder).toBe(4);
    });

    it('should maintain unique sortOrder per collection', async () => {
      // Create another collection with entries
      const [collection2] = await db.insert(collections).values({
        slug: 'another-collection',
        schema: [{ label: 'Title', type: 'text', key: 'title', required: true }],
      }).returning();

      // Add entries to second collection
      for (let i = 0; i < 3; i++) {
        await db.insert(entries).values({
          collectionId: collection2.id,
          slug: `other-entry-${i}`,
          data: { title: `Other Entry ${i}` },
          template: 'default',
          publishedAt: new Date(),
          sortOrder: i,
        });
      }

      // Reorder first collection
      for (let i = 0; i < entryIds.length; i++) {
        await db.update(entries)
          .set({ sortOrder: entryIds.length - 1 - i })
          .where(eq(entries.id, entryIds[i]));
      }

      // Verify second collection is unaffected
      const collection2Entries = await db.select()
        .from(entries)
        .where(eq(entries.collectionId, collection2.id));

      collection2Entries.forEach((entry, index) => {
        const originalIndex = parseInt(entry.slug.split('-')[2]);
        expect(entry.sortOrder).toBe(originalIndex);
      });

      // Cleanup
      await db.delete(entries).where(eq(entries.collectionId, collection2.id));
      await db.delete(collections).where(eq(collections.id, collection2.id));
    });
  });

  describe('edge cases', () => {
    it('should handle reordering with deleted entries', async () => {
      // Soft delete one entry
      await db.update(entries)
        .set({ deletedAt: new Date() })
        .where(eq(entries.id, entryIds[2]));

      // Reorder remaining entries (excluding deleted)
      const activeEntryIds = [entryIds[0], entryIds[1], entryIds[3], entryIds[4]];
      for (let i = 0; i < activeEntryIds.length; i++) {
        await db.update(entries)
          .set({ sortOrder: i })
          .where(eq(entries.id, activeEntryIds[i]));
      }

      // Verify active entries have correct order
      const activeEntries = await db.select()
        .from(entries)
        .where(inArray(entries.id, activeEntryIds));

      expect(activeEntries.find(e => e.id === entryIds[0])?.sortOrder).toBe(0);
      expect(activeEntries.find(e => e.id === entryIds[1])?.sortOrder).toBe(1);
      expect(activeEntries.find(e => e.id === entryIds[3])?.sortOrder).toBe(2);
      expect(activeEntries.find(e => e.id === entryIds[4])?.sortOrder).toBe(3);
    });

    it('should handle single entry (no reorder needed)', async () => {
      // Delete all but one entry
      await db.delete(entries).where(inArray(entries.id, entryIds.slice(1)));

      const remainingEntries = await db.select()
        .from(entries)
        .where(eq(entries.collectionId, collectionId));

      expect(remainingEntries.length).toBe(1);
      expect(remainingEntries[0].sortOrder).toBe(0);
    });

    it('should handle empty collection', async () => {
      await db.delete(entries).where(eq(entries.collectionId, collectionId));

      const noEntries = await db.select()
        .from(entries)
        .where(eq(entries.collectionId, collectionId));

      expect(noEntries.length).toBe(0);
    });
  });
});
