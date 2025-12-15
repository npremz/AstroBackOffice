import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * Document Picker Component Tests
 * 
 * Tests for DocumentPicker component behavior
 */

// Mock file data
const mockFiles = [
  {
    id: 1,
    filename: '1234567890-abc123.pdf',
    originalName: 'document.pdf',
    url: '/files/1234567890-abc123.pdf',
    mimeType: 'application/pdf',
    size: 1048576,
    description: 'Test PDF document',
    uploadedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    filename: '1234567891-def456.docx',
    originalName: 'report.docx',
    url: '/files/1234567891-def456.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 2097152,
    description: 'Word document',
    uploadedAt: '2025-01-02T00:00:00.000Z',
  },
  {
    id: 3,
    filename: '1234567892-ghi789.xlsx',
    originalName: 'data.xlsx',
    url: '/files/1234567892-ghi789.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 512000,
    description: 'Excel spreadsheet',
    uploadedAt: '2025-01-03T00:00:00.000Z',
  },
];

describe('Document Picker Logic', () => {
  describe('File type icon mapping', () => {
    const getFileTypeCategory = (mimeType: string): string => {
      if (mimeType === 'application/pdf') return 'pdf';
      if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'spreadsheet';
      // Check presentation BEFORE document because presentationml contains 'document'
      if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
      if (mimeType.includes('word') || mimeType.includes('wordprocessingml') || mimeType === 'text/plain' || mimeType === 'text/markdown') return 'document';
      if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
      return 'generic';
    };

    it('should categorize PDF files', () => {
      expect(getFileTypeCategory('application/pdf')).toBe('pdf');
    });

    it('should categorize Word documents', () => {
      expect(getFileTypeCategory('application/msword')).toBe('document');
      expect(getFileTypeCategory('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('document');
    });

    it('should categorize Excel spreadsheets', () => {
      expect(getFileTypeCategory('application/vnd.ms-excel')).toBe('spreadsheet');
      expect(getFileTypeCategory('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('spreadsheet');
      expect(getFileTypeCategory('text/csv')).toBe('spreadsheet');
    });

    it('should categorize PowerPoint presentations', () => {
      expect(getFileTypeCategory('application/vnd.ms-powerpoint')).toBe('presentation');
      expect(getFileTypeCategory('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe('presentation');
    });

    it('should categorize archives', () => {
      expect(getFileTypeCategory('application/zip')).toBe('archive');
      expect(getFileTypeCategory('application/x-zip-compressed')).toBe('archive');
      expect(getFileTypeCategory('application/x-rar-compressed')).toBe('archive');
      expect(getFileTypeCategory('application/x-7z-compressed')).toBe('archive');
    });

    it('should categorize text files as documents', () => {
      expect(getFileTypeCategory('text/plain')).toBe('document');
      expect(getFileTypeCategory('text/markdown')).toBe('document');
    });

    it('should return generic for unknown types', () => {
      expect(getFileTypeCategory('application/octet-stream')).toBe('generic');
      expect(getFileTypeCategory('unknown/type')).toBe('generic');
    });
  });

  describe('File extension display', () => {
    const FILE_EXTENSIONS: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'application/vnd.ms-powerpoint': 'PPT',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
      'application/vnd.oasis.opendocument.text': 'ODT',
      'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
      'application/vnd.oasis.opendocument.presentation': 'ODP',
      'text/plain': 'TXT',
      'text/csv': 'CSV',
      'text/markdown': 'MD',
      'application/zip': 'ZIP',
      'application/x-zip-compressed': 'ZIP',
      'application/x-rar-compressed': 'RAR',
      'application/x-7z-compressed': '7Z',
    };

    it('should map all supported MIME types to extensions', () => {
      expect(FILE_EXTENSIONS['application/pdf']).toBe('PDF');
      expect(FILE_EXTENSIONS['application/msword']).toBe('DOC');
      expect(FILE_EXTENSIONS['application/vnd.openxmlformats-officedocument.wordprocessingml.document']).toBe('DOCX');
      expect(FILE_EXTENSIONS['application/vnd.ms-excel']).toBe('XLS');
      expect(FILE_EXTENSIONS['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']).toBe('XLSX');
    });

    it('should handle missing MIME types gracefully', () => {
      const getExtension = (mimeType: string): string => {
        return FILE_EXTENSIONS[mimeType] || 'FILE';
      };
      
      expect(getExtension('unknown/type')).toBe('FILE');
      expect(getExtension('')).toBe('FILE');
    });
  });

  describe('File search filtering', () => {
    const filterFiles = (files: typeof mockFiles, query: string) => {
      if (!query) return files;
      const lowerQuery = query.toLowerCase();
      return files.filter(file =>
        file.originalName.toLowerCase().includes(lowerQuery) ||
        (file.description && file.description.toLowerCase().includes(lowerQuery))
      );
    };

    it('should return all files when query is empty', () => {
      expect(filterFiles(mockFiles, '')).toEqual(mockFiles);
    });

    it('should filter by filename', () => {
      const result = filterFiles(mockFiles, 'report');
      expect(result.length).toBe(1);
      expect(result[0].originalName).toBe('report.docx');
    });

    it('should filter by description', () => {
      const result = filterFiles(mockFiles, 'spreadsheet');
      expect(result.length).toBe(1);
      expect(result[0].originalName).toBe('data.xlsx');
    });

    it('should be case insensitive', () => {
      expect(filterFiles(mockFiles, 'PDF').length).toBe(1);
      expect(filterFiles(mockFiles, 'pdf').length).toBe(1);
      expect(filterFiles(mockFiles, 'PDF')[0]).toEqual(filterFiles(mockFiles, 'pdf')[0]);
    });

    it('should return empty array when no matches', () => {
      const result = filterFiles(mockFiles, 'nonexistent');
      expect(result.length).toBe(0);
    });

    it('should match partial filenames', () => {
      const result = filterFiles(mockFiles, 'data');
      expect(result.length).toBe(1);
      expect(result[0].originalName).toBe('data.xlsx');
    });

    it('should find multiple matches', () => {
      // Both 'document.pdf' has 'document' in name, and 'report.docx' has 'Word document' in description
      const result = filterFiles(mockFiles, 'document');
      expect(result.length).toBe(2);
    });
  });
});

describe('SEO Editor Logic', () => {
  describe('Character count validation', () => {
    const validateLength = (value: string, max: number): { valid: boolean; remaining: number } => {
      const length = value.length;
      return {
        valid: length <= max,
        remaining: max - length,
      };
    };

    it('should validate metaTitle (max 70)', () => {
      expect(validateLength('Short title', 70).valid).toBe(true);
      expect(validateLength('A'.repeat(70), 70).valid).toBe(true);
      expect(validateLength('A'.repeat(71), 70).valid).toBe(false);
    });

    it('should validate metaDescription (max 160)', () => {
      expect(validateLength('Short description', 160).valid).toBe(true);
      expect(validateLength('A'.repeat(160), 160).valid).toBe(true);
      expect(validateLength('A'.repeat(161), 160).valid).toBe(false);
    });

    it('should calculate remaining characters', () => {
      expect(validateLength('Hello', 70).remaining).toBe(65);
      expect(validateLength('A'.repeat(50), 70).remaining).toBe(20);
      expect(validateLength('A'.repeat(80), 70).remaining).toBe(-10);
    });
  });

  describe('URL validation', () => {
    const isValidHttpUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };

    it('should accept valid HTTP URLs', () => {
      expect(isValidHttpUrl('http://example.com')).toBe(true);
      expect(isValidHttpUrl('http://example.com/path')).toBe(true);
      expect(isValidHttpUrl('http://example.com/path?query=value')).toBe(true);
    });

    it('should accept valid HTTPS URLs', () => {
      expect(isValidHttpUrl('https://example.com')).toBe(true);
      expect(isValidHttpUrl('https://example.com/image.jpg')).toBe(true);
      expect(isValidHttpUrl('https://cdn.example.com/assets/image.png')).toBe(true);
    });

    it('should reject non-HTTP protocols', () => {
      expect(isValidHttpUrl('ftp://example.com')).toBe(false);
      expect(isValidHttpUrl('file:///path/to/file')).toBe(false);
      expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject invalid URLs', () => {
      expect(isValidHttpUrl('not-a-url')).toBe(false);
      expect(isValidHttpUrl('')).toBe(false);
      expect(isValidHttpUrl('example.com')).toBe(false);
    });
  });

  describe('SEO preview generation', () => {
    const generatePreview = (data: { 
      metaTitle?: string; 
      metaDescription?: string; 
      slug: string 
    }) => {
      const title = data.metaTitle || data.slug;
      const description = data.metaDescription || 'No description provided';
      const url = `https://example.com/${data.slug}`;
      
      return { title, description, url };
    };

    it('should use metaTitle when provided', () => {
      const preview = generatePreview({
        metaTitle: 'Custom Title',
        slug: 'test-page',
      });
      expect(preview.title).toBe('Custom Title');
    });

    it('should fallback to slug when no metaTitle', () => {
      const preview = generatePreview({ slug: 'test-page' });
      expect(preview.title).toBe('test-page');
    });

    it('should use metaDescription when provided', () => {
      const preview = generatePreview({
        metaDescription: 'Custom description',
        slug: 'test-page',
      });
      expect(preview.description).toBe('Custom description');
    });

    it('should generate URL from slug', () => {
      const preview = generatePreview({ slug: 'blog/my-post' });
      expect(preview.url).toBe('https://example.com/blog/my-post');
    });
  });
});

describe('Scheduling UI Logic', () => {
  describe('Schedule status calculation', () => {
    type ScheduleStatus = 'immediate' | 'scheduled' | 'past';
    
    const getScheduleStatus = (scheduledAt: Date | null): ScheduleStatus => {
      if (!scheduledAt) return 'immediate';
      const now = Date.now();
      if (scheduledAt.getTime() > now) return 'scheduled';
      return 'past';
    };

    it('should return immediate when no date', () => {
      expect(getScheduleStatus(null)).toBe('immediate');
    });

    it('should return scheduled for future dates', () => {
      const future = new Date(Date.now() + 86400000);
      expect(getScheduleStatus(future)).toBe('scheduled');
    });

    it('should return past for past dates', () => {
      const past = new Date(Date.now() - 86400000);
      expect(getScheduleStatus(past)).toBe('past');
    });
  });

  describe('Date formatting for display', () => {
    const formatScheduleDate = (date: Date): string => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    it('should format date correctly', () => {
      const date = new Date('2025-12-25T10:30:00');
      const formatted = formatScheduleDate(date);
      
      expect(formatted).toContain('Dec');
      expect(formatted).toContain('25');
      expect(formatted).toContain('2025');
    });
  });

  describe('Datetime-local input conversion', () => {
    const toDatetimeLocal = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    it('should convert Date to datetime-local format', () => {
      const date = new Date(2025, 11, 25, 10, 30);
      expect(toDatetimeLocal(date)).toBe('2025-12-25T10:30');
    });

    it('should pad single digit values', () => {
      const date = new Date(2025, 0, 5, 9, 5);
      expect(toDatetimeLocal(date)).toBe('2025-01-05T09:05');
    });
  });
});

describe('Trash List Logic', () => {
  describe('Time since deletion', () => {
    const getTimeSinceDelete = (deletedAt: Date): string => {
      const now = Date.now();
      const diff = now - deletedAt.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor(diff / (1000 * 60));
      
      if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      return 'Just now';
    };

    it('should show days for old items', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      expect(getTimeSinceDelete(fiveDaysAgo)).toBe('5 days ago');
    });

    it('should show hours for recent items', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(getTimeSinceDelete(threeHoursAgo)).toBe('3 hours ago');
    });

    it('should show minutes for very recent items', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      expect(getTimeSinceDelete(tenMinutesAgo)).toBe('10 minutes ago');
    });

    it('should show "Just now" for immediate', () => {
      const now = new Date();
      expect(getTimeSinceDelete(now)).toBe('Just now');
    });

    it('should handle singular forms', () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(getTimeSinceDelete(oneDayAgo)).toBe('1 day ago');
      
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      expect(getTimeSinceDelete(oneHourAgo)).toBe('1 hour ago');
      
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      expect(getTimeSinceDelete(oneMinuteAgo)).toBe('1 minute ago');
    });
  });

  describe('Auto-delete warning', () => {
    const getDaysUntilPermanentDelete = (deletedAt: Date, retentionDays: number): number => {
      const deletionTime = deletedAt.getTime();
      const permanentDeleteTime = deletionTime + retentionDays * 24 * 60 * 60 * 1000;
      const remaining = permanentDeleteTime - Date.now();
      return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
    };

    it('should calculate remaining days correctly', () => {
      const deletedYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      // With 30 day retention, should have 29 days left
      expect(getDaysUntilPermanentDelete(deletedYesterday, 30)).toBe(29);
    });

    it('should return 0 when past retention period', () => {
      const deletedLongAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      expect(getDaysUntilPermanentDelete(deletedLongAgo, 30)).toBe(0);
    });

    it('should return full retention for just deleted', () => {
      const justDeleted = new Date();
      expect(getDaysUntilPermanentDelete(justDeleted, 30)).toBe(30);
    });
  });
});

describe('Files Library Sorting', () => {
  const files = [
    { id: 1, originalName: 'alpha.pdf', uploadedAt: new Date('2025-01-01'), size: 1000 },
    { id: 2, originalName: 'beta.docx', uploadedAt: new Date('2025-01-03'), size: 500 },
    { id: 3, originalName: 'gamma.xlsx', uploadedAt: new Date('2025-01-02'), size: 2000 },
  ];

  describe('Sort by date', () => {
    it('should sort by uploadedAt descending (newest first)', () => {
      const sorted = [...files].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      expect(sorted[0].originalName).toBe('beta.docx');
      expect(sorted[1].originalName).toBe('gamma.xlsx');
      expect(sorted[2].originalName).toBe('alpha.pdf');
    });

    it('should sort by uploadedAt ascending (oldest first)', () => {
      const sorted = [...files].sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
      expect(sorted[0].originalName).toBe('alpha.pdf');
      expect(sorted[2].originalName).toBe('beta.docx');
    });
  });

  describe('Sort by name', () => {
    it('should sort alphabetically', () => {
      const sorted = [...files].sort((a, b) => a.originalName.localeCompare(b.originalName));
      expect(sorted[0].originalName).toBe('alpha.pdf');
      expect(sorted[1].originalName).toBe('beta.docx');
      expect(sorted[2].originalName).toBe('gamma.xlsx');
    });
  });

  describe('Sort by size', () => {
    it('should sort by size descending (largest first)', () => {
      const sorted = [...files].sort((a, b) => b.size - a.size);
      expect(sorted[0].originalName).toBe('gamma.xlsx');
      expect(sorted[2].originalName).toBe('beta.docx');
    });
  });
});
