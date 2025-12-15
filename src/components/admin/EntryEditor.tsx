import { useState, useEffect } from 'react';
import { ChevronLeft, Save, AlertCircle, Image as ImageIcon, FileText, Eye, Upload, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RichTextEditor from './RichTextEditor';
import MediaPicker from './MediaPicker';
import DocumentPicker from './DocumentPicker';
import SeoEditor, { type SeoMetadata } from './SeoEditor';
import { apiPost } from '@/lib/api-client';

interface Collection {
  id: number;
  slug: string;
  schema: Array<{
    label: string;
    type: string;
    key: string;
    required: boolean;
  }>;
}

interface Entry {
  id: number;
  collectionId: number;
  slug: string;
  data: Record<string, any>;
  template: string;
  publishedAt: Date;
  scheduledAt?: Date | null;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
    noFollow?: boolean;
  };
}

interface Props {
  collection: Collection;
  entry: Entry | null;
  onBack: () => void;
  onSaveSuccess: () => void;
}

// Helper function to get the default layout for a collection
function getDefaultLayout(collectionSlug: string): string {
  // Remove trailing 's' if present and capitalize
  const singular = collectionSlug.endsWith('s') && collectionSlug !== 'news'
    ? collectionSlug.slice(0, -1)
    : collectionSlug;
  return `${singular.charAt(0).toUpperCase() + singular.slice(1)}Layout`;
}

export default function EntryEditor({ collection, entry, onBack, onSaveSuccess }: Props) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [slugSuffix, setSlugSuffix] = useState(''); // Only the part after collection name
  const [template, setTemplate] = useState('');
  const [seo, setSeo] = useState<SeoMetadata>({});
  const [scheduledAt, setScheduledAt] = useState<string>(''); // ISO string for datetime-local input
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [currentImageField, setCurrentImageField] = useState<string | null>(null);
  const [documentPickerOpen, setDocumentPickerOpen] = useState(false);
  const [currentDocumentField, setCurrentDocumentField] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  // Full slug combining collection name + suffix
  const fullSlug = `${collection.slug}/${slugSuffix}`;

  useEffect(() => {
    const loadEntryData = async () => {
      try {
        if (entry) {
          // Check if this entry is published (not epoch time)
          const published = new Date(entry.publishedAt).getTime() > 0;
          setIsPublished(published);

          // Try to load draft if exists
          try {
            const draftResponse = await fetch(`/api/entries/${entry.id}/draft`);
            if (draftResponse.ok) {
              const draft = await draftResponse.json();
              setFormData(draft.data);
              setHasDraft(true);
              setDraftId(draft.id);
            } else {
              // No draft, use published data
              setFormData(entry.data);
              setHasDraft(false);
            }
          } catch {
            // No draft, use published data
            setFormData(entry.data);
            setHasDraft(false);
          }

          // Extract suffix from full slug (remove collection prefix)
          const suffix = entry.slug.startsWith(`${collection.slug}/`)
            ? entry.slug.substring(`${collection.slug}/`.length)
            : entry.slug;
          setSlugSuffix(suffix);

          // Load SEO metadata
          setSeo(entry.seo || {});

          // Load scheduled date (convert to datetime-local format)
          if (entry.scheduledAt) {
            const date = new Date(entry.scheduledAt);
            // Format for datetime-local input: YYYY-MM-DDTHH:mm
            const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
            setScheduledAt(localDate);
          } else {
            setScheduledAt('');
          }

          // Validate template - only allow collection default or BaseLayout
          const defaultLayout = getDefaultLayout(collection.slug);
          const validTemplates = [defaultLayout, 'BaseLayout'];
          if (validTemplates.includes(entry.template)) {
            setTemplate(entry.template);
          } else {
            // Reset to default if invalid template
            setTemplate(defaultLayout);
            toast.warning('Template reset', {
              description: `Invalid template "${entry.template}" was reset to ${defaultLayout}`,
            });
          }
        } else {
          // Initialize with empty values for new entry
          const initialData: Record<string, any> = {};
          collection.schema.forEach(field => {
            initialData[field.key] = '';
          });
          setFormData(initialData);
          setSlugSuffix('');
          setTemplate(getDefaultLayout(collection.slug));
          setSeo({});
          setScheduledAt('');
          setIsPublished(false);
          setHasDraft(false);
        }
      } catch (error) {
        console.error('Error loading entry data:', error);
        toast.error('Failed to load entry data');
      }
    };

    loadEntryData();
  }, [entry, collection]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));

    // Auto-generate slug suffix from title if it's a new entry
    if (key === 'title' && !entry) {
      const slugified = value.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlugSuffix(slugified);
    }
  };

  const validateForm = () => {
    // Validation
    for (const field of collection.schema) {
      if (field.required && !formData[field.key]) {
        setError(`${field.label} is required`);
        return false;
      }
    }

    if (!slugSuffix) {
      setError('Slug is required');
      return false;
    }

    return true;
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    if (!validateForm()) {
      setSaving(false);
      return;
    }

    try {
      if (entry) {
        // Save draft for existing entry
        const draft = await apiPost(`/api/entries/${entry.id}/draft`, {
          data: formData,
          slug: fullSlug,
          template,
          seo
        });

        setDraftId((draft as any).id);
        setHasDraft(true);

        toast.success('Draft saved successfully!', {
          description: 'Your changes have been saved as a draft.',
        });
      } else {
        // Create new entry as draft
        await apiPost('/api/revisions', {
          collectionId: collection.id,
          slug: fullSlug,
          data: formData,
          template,
          seo
        });

        toast.success('Draft created successfully!', {
          description: 'Your entry has been saved as a draft.',
        });

        onSaveSuccess();
      }
    } catch (err) {
      setError('Failed to save draft. Please try again.');
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPublishing(true);

    if (!validateForm()) {
      setPublishing(false);
      return;
    }

    try {
      // Convert scheduledAt to ISO string if set
      const scheduledAtISO = scheduledAt ? new Date(scheduledAt).toISOString() : null;

      const payload = {
        collectionId: collection.id,
        slug: fullSlug,
        data: formData,
        template,
        seo,
        scheduledAt: scheduledAtISO
      };

      if (entry) {
        // Publish existing entry
        await apiPost(`/api/entries/${entry.id}/publish`, payload);
      } else {
        // Create and publish new entry
        await apiPost('/api/entries', payload);
      }

      const entryTitle = formData.title || fullSlug;
      if (scheduledAtISO && new Date(scheduledAtISO) > new Date()) {
        toast.success('Entry scheduled successfully!', {
          description: `"${entryTitle}" will be published on ${new Date(scheduledAtISO).toLocaleString()}.`,
        });
      } else {
        toast.success('Entry published successfully!', {
          description: `"${entryTitle}" is now live.`,
        });
      }

      onSaveSuccess();
    } catch (err) {
      setError('Failed to publish entry. Please try again.');
      toast.error('Failed to publish entry');
    } finally {
      setPublishing(false);
    }
  };

  const handlePreview = async () => {
    // Save preview data to API
    const previewData = {
      collection: collection.slug,
      slug: fullSlug,
      data: formData,
      template,
      seo
    };

    try {
      // Store in sessionStorage as fallback
      sessionStorage.setItem('preview-data', JSON.stringify(previewData));

      // Also save to API for server-side rendering
      const result = await apiPost<{ previewId: string }>('/api/preview', previewData);
      // Open preview window with dynamic layout rendering
      window.open(`/preview-render/${fullSlug}?id=${result.previewId}`, '_blank');
    } catch (error) {
      // Fallback to sessionStorage only (generic preview)
      window.open(`/preview/${fullSlug}`, '_blank');
    }
  };

  const renderField = (field: Collection['schema'][0]) => {
    const value = formData[field.key] || '';

    switch (field.type) {
      case 'text':
        return (
          <Input
            type="text"
            id={`field-${field.key}`}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
            className="h-11 text-base"
          />
        );

      case 'textarea':
        return (
          <Textarea
            id={`field-${field.key}`}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            rows={5}
            required={field.required}
            className="text-base resize-none"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            id={`field-${field.key}`}
            value={value}
            onChange={(e) => handleFieldChange(field.key, parseFloat(e.target.value) || 0)}
            placeholder="0"
            required={field.required}
            className="h-11 text-base"
          />
        );

      case 'richtext':
        return (
          <RichTextEditor
            value={value}
            onChange={(html) => handleFieldChange(field.key, html)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        );

      case 'image':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="text"
                id={`field-${field.key}`}
                value={value}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder="/images/example.jpg or https://..."
                required={field.required}
                className="flex-1 h-11 text-base"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  setCurrentImageField(field.key);
                  setMediaPickerOpen(true);
                }}
                title="Select from media library"
                className="h-11 w-11"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
            {value && (
              <div className="rounded-xl border border-border/50 p-3 bg-gradient-to-br from-muted/20 to-background">
                <img
                  src={value}
                  alt="Preview"
                  className="w-full h-56 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium tracking-wide">
              Enter an image URL or select from media library
            </p>
          </div>
        );

      case 'document':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="text"
                id={`field-${field.key}`}
                value={value}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder="/files/document.pdf or https://..."
                required={field.required}
                className="flex-1 h-11 text-base"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  setCurrentDocumentField(field.key);
                  setDocumentPickerOpen(true);
                }}
                title="Select from files library"
                className="h-11 w-11"
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
            {value && (
              <div className="rounded-xl border border-border/50 p-3 bg-gradient-to-br from-muted/20 to-background">
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  <span className="truncate">{value.split('/').pop()}</span>
                </a>
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium tracking-wide">
              Enter a document URL or select from files library
            </p>
          </div>
        );

      default:
        return (
          <Input
            type="text"
            id={`field-${field.key}`}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            required={field.required}
            className="h-11 text-base"
          />
        );
    }
  };

  return (
    <div className="space-y-8" key={entry?.id || 'new'}>
      {/* Editorial Header */}
      <div className="flex items-start gap-4 stagger-fade-in stagger-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="hidden md:flex hover-lift mt-1"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap lg:hidden">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {entry ? 'Edit Entry' : 'New Entry'}
            </h2>
            {hasDraft && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                Draft
              </Badge>
            )}
            {entry && isPublished && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                Published
              </Badge>
            )}
          </div>
          <h2 className="hidden lg:block text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {entry ? 'Edit Entry' : 'New Entry'}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-medium tracking-wide capitalize">
            {collection.slug} Collection
          </p>
        </div>
      </div>

      {/* Two column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Main Content Area */}
        <div className="space-y-8">
          {/* Content Fields Card */}
          <Card className="card-float bg-card border-border/50 overflow-hidden stagger-fade-in stagger-2">
            <div className="h-1 w-full bg-gradient-to-r from-accent via-primary to-accent/50" />

            <CardHeader className="bg-gradient-to-br from-muted/20 to-transparent">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-accent/10 to-primary/10">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-xl sm:text-2xl font-bold">Content</CardTitle>
                    <CardDescription className="mt-2">
                      Fill in the fields for this entry
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="font-medium bg-accent/10 text-accent border-accent/30 px-3 py-1.5">
                  {collection.schema.length} {collection.schema.length === 1 ? 'field' : 'fields'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {collection.schema.map((field, index) => (
                <div
                  key={field.key}
                  className={`space-y-3 p-5 sm:p-6 rounded-xl bg-gradient-to-br from-muted/10 to-background border border-border/50 stagger-fade-in stagger-${Math.min(index + 3, 8)}`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Label htmlFor={`field-${field.key}`} className="text-sm font-semibold tracking-wide">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Badge variant="secondary" className="text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                      {field.type}
                    </Badge>
                  </div>
                  {renderField(field)}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* SEO Editor */}
          <SeoEditor
            seo={seo}
            onChange={setSeo}
            defaultTitle={formData.title || ''}
            defaultDescription={formData.description || ''}
          />

          {/* Scheduling Card */}
          <Card className="card-float bg-card border-border/50 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Schedule Publication</CardTitle>
                  <CardDescription className="mt-1">
                    Set a future date to publish this entry
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt" className="text-sm font-semibold">
                  Publish Date & Time
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="flex-1 h-11"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {scheduledAt && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setScheduledAt('')}
                      className="h-11 w-11"
                      title="Clear scheduled date"
                    >
                      ×
                    </Button>
                  )}
                </div>
                {scheduledAt && new Date(scheduledAt) > new Date() && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-600 font-medium">
                      Will be published on {new Date(scheduledAt).toLocaleString()}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Leave empty to publish immediately. Scheduled entries won't be visible until the scheduled date.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="stagger-fade-in">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">{error}</AlertDescription>
            </Alert>
          )}

          {/* Mobile Actions - Sticky Bottom */}
          <div className="lg:hidden flex flex-col gap-3 sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 -mx-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="hover-lift"
              size="lg"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="font-semibold">Cancel</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              className="hover-lift"
              size="lg"
            >
              <Eye className="h-4 w-4 mr-2" />
              <span className="font-semibold">Preview</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDraft}
              disabled={saving || publishing}
              className="hover-lift"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              <span className="font-semibold">
                {saving ? 'Saving...' : 'Save Draft'}
              </span>
            </Button>

            <Button
              type="button"
              onClick={handlePublish}
              disabled={saving || publishing}
              className="bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
              size="lg"
            >
              <Upload className="h-4 w-4 mr-2" />
              <span className="font-semibold">
                {publishing ? 'Publishing...' : entry && isPublished ? 'Update & Publish' : 'Publish'}
              </span>
            </Button>
          </div>
        </div>

        {/* Right Sidebar - Desktop Only */}
        <div className="hidden lg:block">
          <div className="space-y-6 stagger-fade-in stagger-3">
            {/* Status Card */}
            <Card className="card-float bg-card border-border/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {hasDraft && (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      Draft Saved
                    </Badge>
                  )}
                  {entry && isPublished && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Published
                    </Badge>
                  )}
                  {!entry && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      New Entry
                    </Badge>
                  )}
                </div>
                {entry && (
                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    {isPublished && (
                      <p>Published: {new Date(entry.publishedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meta Information Card */}
            <Card className="card-float bg-card border-border/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Meta Information</CardTitle>
                <CardDescription>
                  URL and template settings
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Slug with collection prefix */}
                <div className="space-y-2">
                  <Label htmlFor="slugSuffix" className="text-sm font-semibold tracking-wide">
                    Slug <span className="text-destructive">*</span>
                  </Label>
                  <div className="space-y-2">
                    <div className="text-xs font-mono bg-muted/70 px-3 py-2 rounded-lg border border-border/50 text-muted-foreground">
                      {collection.slug}/
                    </div>
                    <Input
                      id="slugSuffix"
                      type="text"
                      value={slugSuffix}
                      onChange={(e) => setSlugSuffix(e.target.value)}
                      placeholder="my-entry"
                      required
                      className="h-10 text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <code className="bg-muted/70 px-2 py-0.5 rounded font-mono text-xs">/{fullSlug}</code>
                  </p>
                </div>

                {/* Template */}
                <div className="space-y-2">
                  <Label htmlFor="template" className="text-sm font-semibold tracking-wide">
                    Template
                  </Label>
                  <Select value={template} onValueChange={setTemplate}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={getDefaultLayout(collection.slug)}>
                        {getDefaultLayout(collection.slug)}
                      </SelectItem>
                      <SelectItem value="BaseLayout">
                        BaseLayout
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Actions Card - Sticky at bottom when scrolling */}
            <div className="sticky top-8">
              <Card className="card-float bg-card border-border/50 overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                    className="w-full hover-lift"
                    size="lg"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    <span className="font-semibold">Preview</span>
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={saving || publishing}
                    className="w-full hover-lift"
                    size="lg"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    <span className="font-semibold">
                      {saving ? 'Saving...' : 'Save Draft'}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handlePublish}
                    disabled={saving || publishing}
                    className="w-full bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
                    size="lg"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    <span className="font-semibold">
                      {publishing ? 'Publishing...' : entry && isPublished ? 'Update & Publish' : 'Publish'}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onBack}
                    className="w-full hover-lift"
                    size="lg"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    <span className="font-semibold">Cancel</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Dialog */}
      <MediaPicker
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={(url) => {
          if (currentImageField) {
            handleFieldChange(currentImageField, url);
          }
        }}
        currentValue={currentImageField ? formData[currentImageField] : ''}
      />

      <DocumentPicker
        open={documentPickerOpen}
        onOpenChange={setDocumentPickerOpen}
        onSelect={(url) => {
          if (currentDocumentField) {
            handleFieldChange(currentDocumentField, url);
          }
        }}
        currentValue={currentDocumentField ? formData[currentDocumentField] : ''}
      />
    </div>
  );
}
