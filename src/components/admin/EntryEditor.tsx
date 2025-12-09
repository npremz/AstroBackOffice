import { useState, useEffect } from 'react';
import { ChevronLeft, Save, AlertCircle, Image as ImageIcon, FileText, Eye, Upload } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [currentImageField, setCurrentImageField] = useState<string | null>(null);
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
        const response = await fetch(`/api/entries/${entry.id}/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: formData,
            slug: fullSlug,
            template
          })
        });

        if (!response.ok) throw new Error('Failed to save draft');

        const draft = await response.json();
        setDraftId(draft.id);
        setHasDraft(true);

        toast.success('Draft saved successfully!', {
          description: 'Your changes have been saved as a draft.',
        });
      } else {
        // Create new entry as draft
        const response = await fetch('/api/revisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collectionId: collection.id,
            slug: fullSlug,
            data: formData,
            template
          })
        });

        if (!response.ok) throw new Error('Failed to create draft');

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
      const payload = {
        collectionId: collection.id,
        slug: fullSlug,
        data: formData,
        template
      };

      let response;
      if (entry) {
        // Publish existing entry
        response = await fetch(`/api/entries/${entry.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create and publish new entry
        response = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) throw new Error('Failed to publish');

      const entryTitle = formData.title || fullSlug;
      toast.success('Entry published successfully!', {
        description: `"${entryTitle}" is now live.`,
      });

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
      template
    };

    try {
      // Store in sessionStorage as fallback
      sessionStorage.setItem('preview-data', JSON.stringify(previewData));

      // Also save to API for server-side rendering
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previewData)
      });

      if (response.ok) {
        const { previewId } = await response.json();
        // Open preview window with dynamic layout rendering (Solution 3)
        window.open(`/preview-render/${fullSlug}?id=${previewId}`, '_blank');
      } else {
        // Fallback to sessionStorage only (generic preview)
        window.open(`/preview/${fullSlug}`, '_blank');
      }
    } catch (error) {
      // Fallback to sessionStorage only
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
          <div className="flex items-center gap-3 flex-wrap">
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
          <p className="text-sm sm:text-base text-muted-foreground font-medium tracking-wide capitalize">
            {collection.slug} Collection
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Meta Information Card */}
        <Card className="card-float bg-card border-border/50 overflow-hidden stagger-fade-in stagger-2">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/50" />

          <CardHeader className="bg-gradient-to-br from-muted/20 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <Save className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold">Meta Information</CardTitle>
                <CardDescription className="mt-1">
                  Configure URL and template settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-6">
            <div className="grid grid-cols-1 gap-5">
              {/* Slug with collection prefix */}
              <div className="space-y-3">
                <Label htmlFor="slugSuffix" className="text-sm font-semibold tracking-wide">
                  Slug <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-stretch gap-2">
                  <div className="flex items-center bg-muted/70 px-4 rounded-lg border border-border/50 text-sm text-muted-foreground font-mono font-medium">
                    {collection.slug}/
                  </div>
                  <Input
                    id="slugSuffix"
                    type="text"
                    value={slugSuffix}
                    onChange={(e) => setSlugSuffix(e.target.value)}
                    placeholder="my-entry"
                    required
                    className="flex-1 h-11 text-base"
                  />
                </div>
                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                  URL path: <code className="bg-muted/70 px-2 py-1 rounded font-mono">/{fullSlug}</code>
                </p>
              </div>

              {/* Template */}
              <div className="space-y-3">
                <Label htmlFor="template" className="text-sm font-semibold tracking-wide">
                  Template
                </Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger className="h-11 text-base">
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
                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                  Use collection layout or basic layout
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Fields Card */}
        <Card className="card-float bg-card border-border/50 overflow-hidden stagger-fade-in stagger-3">
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
                className={`space-y-3 p-5 sm:p-6 rounded-xl bg-gradient-to-br from-muted/10 to-background border border-border/50 stagger-fade-in stagger-${Math.min(index + 4, 8)}`}
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

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="stagger-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 -mx-4 border-t border-border/50 sm:static sm:bg-transparent sm:p-0 sm:border-0 stagger-fade-in stagger-4">
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

          <div className="flex-1" />

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
    </div>
  );
}
