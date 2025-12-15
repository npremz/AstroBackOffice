import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  schemaFieldSchema,
  createCollectionSchema,
  createEntrySchema,
  seoMetadataSchema,
} from '@/lib/validation';

/**
 * Files API Tests
 * 
 * Tests for the document/files management feature including:
 * - File validation
 * - Document field type in schemas
 * - SEO metadata validation
 * - Soft delete logic
 * - Scheduling logic
 */

describe('Files Feature', () => {
  describe('Document field type validation', () => {
    it('should accept document as a valid field type', () => {
      const result = schemaFieldSchema.safeParse({
        label: 'PDF Document',
        type: 'document',
        key: 'pdfDocument',
        required: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid field types including document', () => {
      const validTypes = ['text', 'textarea', 'number', 'richtext', 'image', 'document'];
      
      for (const type of validTypes) {
        const result = schemaFieldSchema.safeParse({
          label: `Test ${type}`,
          type,
          key: `test${type.charAt(0).toUpperCase() + type.slice(1)}`,
          required: false,
        });
        expect(result.success, `Type '${type}' should be valid`).toBe(true);
      }
    });

    it('should reject invalid field types', () => {
      const invalidTypes = ['file', 'pdf', 'attachment', 'media', 'unknown'];
      
      for (const type of invalidTypes) {
        const result = schemaFieldSchema.safeParse({
          label: 'Test',
          type,
          key: 'testKey',
          required: false,
        });
        expect(result.success, `Type '${type}' should be invalid`).toBe(false);
      }
    });

    it('should accept collection schema with document field', () => {
      const result = createCollectionSchema.safeParse({
        slug: 'downloads',
        schema: [
          { label: 'Title', type: 'text', key: 'title', required: true },
          { label: 'PDF File', type: 'document', key: 'pdfFile', required: true },
          { label: 'Description', type: 'textarea', key: 'description', required: false },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept mixed field types in collection schema', () => {
      const result = createCollectionSchema.safeParse({
        slug: 'resources',
        schema: [
          { label: 'Title', type: 'text', key: 'title', required: true },
          { label: 'Content', type: 'richtext', key: 'content', required: false },
          { label: 'Cover Image', type: 'image', key: 'coverImage', required: false },
          { label: 'Attachment', type: 'document', key: 'attachment', required: false },
          { label: 'Downloads', type: 'number', key: 'downloads', required: false },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('File MIME type categories', () => {
    const PDF_TYPES = ['application/pdf'];
    const OFFICE_TYPES = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    const OPENDOC_TYPES = [
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation',
    ];
    const TEXT_TYPES = ['text/plain', 'text/csv', 'text/markdown'];
    const ARCHIVE_TYPES = [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ];

    it('should have PDF types defined', () => {
      expect(PDF_TYPES.length).toBeGreaterThan(0);
      expect(PDF_TYPES).toContain('application/pdf');
    });

    it('should have Office types defined', () => {
      expect(OFFICE_TYPES.length).toBe(6);
      expect(OFFICE_TYPES).toContain('application/msword');
      expect(OFFICE_TYPES).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should have OpenDocument types defined', () => {
      expect(OPENDOC_TYPES.length).toBe(3);
    });

    it('should have text types defined', () => {
      expect(TEXT_TYPES).toContain('text/plain');
      expect(TEXT_TYPES).toContain('text/csv');
      expect(TEXT_TYPES).toContain('text/markdown');
    });

    it('should have archive types defined', () => {
      expect(ARCHIVE_TYPES.length).toBe(4);
      expect(ARCHIVE_TYPES).toContain('application/zip');
    });
  });
});

describe('SEO Metadata Feature', () => {
  describe('SEO metadata validation', () => {
    it('should accept valid SEO metadata', () => {
      const result = seoMetadataSchema.safeParse({
        metaTitle: 'Page Title',
        metaDescription: 'This is a page description for SEO purposes.',
        ogTitle: 'Open Graph Title',
        ogDescription: 'Open Graph description for social sharing.',
        ogImage: 'https://example.com/image.jpg',
        canonicalUrl: 'https://example.com/page',
        noIndex: false,
        noFollow: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty/partial SEO metadata', () => {
      const result = seoMetadataSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept only metaTitle', () => {
      const result = seoMetadataSchema.safeParse({
        metaTitle: 'Just a title',
      });
      expect(result.success).toBe(true);
    });

    it('should reject metaTitle over 70 characters', () => {
      const result = seoMetadataSchema.safeParse({
        metaTitle: 'A'.repeat(71),
      });
      expect(result.success).toBe(false);
    });

    it('should reject metaDescription over 160 characters', () => {
      const result = seoMetadataSchema.safeParse({
        metaDescription: 'A'.repeat(161),
      });
      expect(result.success).toBe(false);
    });

    it('should reject ogDescription over 200 characters', () => {
      const result = seoMetadataSchema.safeParse({
        ogDescription: 'A'.repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid URLs for ogImage', () => {
      const result = seoMetadataSchema.safeParse({
        ogImage: 'not-a-valid-url',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-http URLs for ogImage', () => {
      const result = seoMetadataSchema.safeParse({
        ogImage: 'ftp://example.com/image.jpg',
      });
      expect(result.success).toBe(false);
    });

    it('should accept https URLs for ogImage', () => {
      const result = seoMetadataSchema.safeParse({
        ogImage: 'https://example.com/image.jpg',
      });
      expect(result.success).toBe(true);
    });

    it('should accept http URLs for ogImage', () => {
      const result = seoMetadataSchema.safeParse({
        ogImage: 'http://example.com/image.jpg',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid canonicalUrl', () => {
      const result = seoMetadataSchema.safeParse({
        canonicalUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should accept boolean noIndex and noFollow', () => {
      const result = seoMetadataSchema.safeParse({
        noIndex: true,
        noFollow: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Entry with SEO metadata', () => {
    it('should accept entry with full SEO metadata', () => {
      const result = createEntrySchema.safeParse({
        collectionId: 1,
        slug: 'test-post',
        data: { title: 'Test Post' },
        template: 'BaseLayout',
        seo: {
          metaTitle: 'Test Post | My Blog',
          metaDescription: 'A test post for SEO validation.',
          ogTitle: 'Test Post',
          ogDescription: 'Read this test post on my blog.',
          ogImage: 'https://example.com/test.jpg',
          canonicalUrl: 'https://example.com/test-post',
          noIndex: false,
          noFollow: false,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept entry without SEO metadata', () => {
      const result = createEntrySchema.safeParse({
        collectionId: 1,
        slug: 'test-post',
        data: { title: 'Test Post' },
        template: 'BaseLayout',
        seo: {},
      });
      expect(result.success).toBe(true);
    });

    it('should accept entry with partial SEO metadata', () => {
      const result = createEntrySchema.safeParse({
        collectionId: 1,
        slug: 'test-post',
        data: { title: 'Test Post' },
        template: 'BaseLayout',
        seo: {
          metaTitle: 'Test Post',
        },
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('Soft Delete Feature', () => {
  describe('Soft delete date handling', () => {
    it('should handle null deletedAt for active entries', () => {
      const entry = {
        id: 1,
        slug: 'test',
        data: {},
        status: 'published',
        deletedAt: null,
      };
      expect(entry.deletedAt).toBeNull();
    });

    it('should handle Date deletedAt for soft-deleted entries', () => {
      const now = new Date();
      const entry = {
        id: 1,
        slug: 'test',
        data: {},
        status: 'draft',
        deletedAt: now,
      };
      expect(entry.deletedAt).toBeInstanceOf(Date);
      expect(entry.deletedAt.getTime()).toBe(now.getTime());
    });

    it('should correctly identify soft-deleted entries', () => {
      const activeEntry = { deletedAt: null };
      const deletedEntry = { deletedAt: new Date() };
      
      const isDeleted = (entry: { deletedAt: Date | null }) => entry.deletedAt !== null;
      
      expect(isDeleted(activeEntry)).toBe(false);
      expect(isDeleted(deletedEntry)).toBe(true);
    });
  });
});

describe('Scheduling Feature', () => {
  describe('Scheduled publication date handling', () => {
    it('should handle null scheduledAt for immediate publication', () => {
      const entry = {
        id: 1,
        slug: 'test',
        status: 'published',
        scheduledAt: null,
      };
      expect(entry.scheduledAt).toBeNull();
    });

    it('should handle future scheduledAt for scheduled entries', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const entry = {
        id: 1,
        slug: 'test',
        status: 'draft',
        scheduledAt: futureDate,
      };
      expect(entry.scheduledAt).toBeInstanceOf(Date);
      expect(entry.scheduledAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should correctly identify scheduled entries', () => {
      const now = Date.now();
      const pastDate = new Date(now - 86400000); // 1 day ago
      const futureDate = new Date(now + 86400000); // 1 day from now
      
      const isScheduled = (entry: { scheduledAt: Date | null }) => {
        return entry.scheduledAt !== null && entry.scheduledAt.getTime() > now;
      };
      
      expect(isScheduled({ scheduledAt: null })).toBe(false);
      expect(isScheduled({ scheduledAt: pastDate })).toBe(false);
      expect(isScheduled({ scheduledAt: futureDate })).toBe(true);
    });

    it('should correctly identify entries ready for publication', () => {
      const now = Date.now();
      const pastDate = new Date(now - 86400000);
      const futureDate = new Date(now + 86400000);
      
      const isReadyToPublish = (entry: { status: string; scheduledAt: Date | null }) => {
        if (entry.status !== 'draft') return false;
        if (entry.scheduledAt === null) return false;
        return entry.scheduledAt.getTime() <= now;
      };
      
      expect(isReadyToPublish({ status: 'published', scheduledAt: pastDate })).toBe(false);
      expect(isReadyToPublish({ status: 'draft', scheduledAt: null })).toBe(false);
      expect(isReadyToPublish({ status: 'draft', scheduledAt: futureDate })).toBe(false);
      expect(isReadyToPublish({ status: 'draft', scheduledAt: pastDate })).toBe(true);
    });
  });

  describe('ISO date string handling', () => {
    it('should parse ISO date strings correctly', () => {
      const isoString = '2025-12-25T10:00:00.000Z';
      const date = new Date(isoString);
      
      expect(date.getUTCMonth()).toBe(11); // December (0-indexed)
      expect(date.getUTCDate()).toBe(25);
      expect(date.getUTCHours()).toBe(10);
    });

    it('should format dates to ISO strings', () => {
      const date = new Date(Date.UTC(2025, 11, 25, 10, 0, 0));
      const isoString = date.toISOString();
      
      expect(isoString).toBe('2025-12-25T10:00:00.000Z');
    });

    it('should handle datetime-local input format', () => {
      // datetime-local inputs use format: YYYY-MM-DDTHH:MM
      const datetimeLocalValue = '2025-12-25T10:00';
      const date = new Date(datetimeLocalValue);
      
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(11);
      expect(date.getDate()).toBe(25);
    });
  });
});

describe('Trash Feature', () => {
  describe('Trash filtering logic', () => {
    const entries = [
      { id: 1, slug: 'active-1', deletedAt: null },
      { id: 2, slug: 'active-2', deletedAt: null },
      { id: 3, slug: 'deleted-1', deletedAt: new Date('2025-01-01') },
      { id: 4, slug: 'deleted-2', deletedAt: new Date('2025-01-02') },
    ];

    it('should filter out deleted entries for main list', () => {
      const activeEntries = entries.filter(e => e.deletedAt === null);
      
      expect(activeEntries.length).toBe(2);
      expect(activeEntries.map(e => e.slug)).toEqual(['active-1', 'active-2']);
    });

    it('should filter only deleted entries for trash', () => {
      const trashedEntries = entries.filter(e => e.deletedAt !== null);
      
      expect(trashedEntries.length).toBe(2);
      expect(trashedEntries.map(e => e.slug)).toEqual(['deleted-1', 'deleted-2']);
    });

    it('should sort trash by deletion date descending', () => {
      const trashedEntries = entries
        .filter(e => e.deletedAt !== null)
        .sort((a, b) => {
          if (!a.deletedAt || !b.deletedAt) return 0;
          return b.deletedAt.getTime() - a.deletedAt.getTime();
        });
      
      expect(trashedEntries[0].slug).toBe('deleted-2');
      expect(trashedEntries[1].slug).toBe('deleted-1');
    });
  });

  describe('Restore from trash', () => {
    it('should restore entry by setting deletedAt to null', () => {
      const entry = {
        id: 1,
        slug: 'test',
        deletedAt: new Date(),
      };
      
      // Simulate restore
      const restoredEntry = { ...entry, deletedAt: null };
      
      expect(restoredEntry.deletedAt).toBeNull();
    });
  });

  describe('Permanent delete', () => {
    it('should remove entry completely from array', () => {
      const entries = [
        { id: 1, slug: 'keep' },
        { id: 2, slug: 'delete' },
        { id: 3, slug: 'keep-too' },
      ];
      
      const afterDelete = entries.filter(e => e.id !== 2);
      
      expect(afterDelete.length).toBe(2);
      expect(afterDelete.find(e => e.id === 2)).toBeUndefined();
    });
  });
});

describe('Field Key Generation', () => {
  describe('Label to key conversion', () => {
    const generateKey = (label: string): string => {
      return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');
    };

    it('should convert simple labels to keys', () => {
      expect(generateKey('Title')).toBe('title');
      expect(generateKey('Description')).toBe('description');
    });

    it('should handle spaces', () => {
      expect(generateKey('First Name')).toBe('first_name');
      expect(generateKey('PDF Document')).toBe('pdf_document');
    });

    it('should handle special characters', () => {
      expect(generateKey('Price ($)')).toBe('price');
      expect(generateKey('Email Address!')).toBe('email_address');
    });

    it('should handle multiple spaces and special chars', () => {
      expect(generateKey('My   Super   Field')).toBe('my_super_field');
      expect(generateKey('---test---')).toBe('test');
    });

    it('should validate generated keys against schema', () => {
      const keys = [
        generateKey('Title'),
        generateKey('First Name'),
        generateKey('PDF Document'),
        generateKey('Cover Image'),
      ];
      
      for (const key of keys) {
        const result = schemaFieldSchema.safeParse({
          label: 'Test',
          type: 'text',
          key,
          required: false,
        });
        expect(result.success, `Key '${key}' should be valid`).toBe(true);
      }
    });
  });
});

describe('File Size Formatting', () => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  it('should format bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('should format kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(10240)).toBe('10 KB');
  });

  it('should format megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(5242880)).toBe('5 MB');
    expect(formatFileSize(10485760)).toBe('10 MB');
  });

  it('should format gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
    expect(formatFileSize(2147483648)).toBe('2 GB');
  });
});

describe('Duplication Feature', () => {
  describe('Slug generation for duplicates', () => {
    const generateDuplicateSlug = (originalSlug: string, existingSlugs: string[]): string => {
      let newSlug = `${originalSlug}-copy`;
      let counter = 1;
      
      while (existingSlugs.includes(newSlug)) {
        counter++;
        newSlug = `${originalSlug}-copy-${counter}`;
      }
      
      return newSlug;
    };

    it('should append -copy for first duplicate', () => {
      expect(generateDuplicateSlug('my-post', [])).toBe('my-post-copy');
    });

    it('should append -copy when no conflict', () => {
      expect(generateDuplicateSlug('my-post', ['other-post'])).toBe('my-post-copy');
    });

    it('should append -copy-2 when -copy exists', () => {
      expect(generateDuplicateSlug('my-post', ['my-post-copy'])).toBe('my-post-copy-2');
    });

    it('should increment counter for multiple duplicates', () => {
      const existing = ['my-post-copy', 'my-post-copy-2', 'my-post-copy-3'];
      expect(generateDuplicateSlug('my-post', existing)).toBe('my-post-copy-4');
    });

    it('should handle gaps in numbering', () => {
      const existing = ['my-post-copy', 'my-post-copy-3'];
      expect(generateDuplicateSlug('my-post', existing)).toBe('my-post-copy-2');
    });
  });

  describe('Single type name generation for duplicates', () => {
    const generateDuplicateName = (originalName: string, counter: number): string => {
      if (counter === 1) return `${originalName} (Copy)`;
      return `${originalName} (Copy ${counter})`;
    };

    it('should append (Copy) for first duplicate', () => {
      expect(generateDuplicateName('About Page', 1)).toBe('About Page (Copy)');
    });

    it('should append (Copy N) for subsequent duplicates', () => {
      expect(generateDuplicateName('About Page', 2)).toBe('About Page (Copy 2)');
      expect(generateDuplicateName('About Page', 3)).toBe('About Page (Copy 3)');
    });
  });

  describe('Entry duplication data handling', () => {
    it('should create draft status for duplicated entry', () => {
      const original = {
        id: 1,
        slug: 'blog/my-post',
        data: { title: 'My Post', content: 'Content here' },
        template: 'BlogLayout',
        status: 'published',
        scheduledAt: new Date('2025-01-01'),
        seo: { metaTitle: 'My Post' },
      };

      const duplicated = {
        ...original,
        id: 2,
        slug: 'blog/my-post-copy',
        status: 'draft',
        scheduledAt: null, // Should not copy scheduling
        deletedAt: null,
        publishedAt: null,
      };

      expect(duplicated.status).toBe('draft');
      expect(duplicated.scheduledAt).toBeNull();
      expect(duplicated.data).toEqual(original.data);
      expect(duplicated.seo).toEqual(original.seo);
    });

    it('should preserve data and SEO metadata', () => {
      const originalData = {
        title: 'Test',
        content: '<p>Rich content</p>',
        image: '/images/test.jpg',
      };
      const originalSeo = {
        metaTitle: 'Test | Site',
        metaDescription: 'Description',
        ogImage: 'https://example.com/og.jpg',
      };

      const duplicatedEntry = {
        data: { ...originalData },
        seo: { ...originalSeo },
      };

      expect(duplicatedEntry.data).toEqual(originalData);
      expect(duplicatedEntry.seo).toEqual(originalSeo);
    });
  });

  describe('Single type duplication data handling', () => {
    it('should copy schema and data', () => {
      const original = {
        id: 1,
        slug: 'about',
        name: 'About Page',
        schema: [
          { label: 'Title', type: 'text', key: 'title', required: true },
          { label: 'Content', type: 'richtext', key: 'content', required: false },
        ],
        data: { title: 'About Us', content: '<p>Our story</p>' },
      };

      const duplicated = {
        id: 2,
        slug: 'about-copy',
        name: 'About Page (Copy)',
        schema: [...original.schema],
        data: { ...original.data },
      };

      expect(duplicated.schema).toEqual(original.schema);
      expect(duplicated.data).toEqual(original.data);
      expect(duplicated.slug).toBe('about-copy');
      expect(duplicated.name).toBe('About Page (Copy)');
    });
  });
});
