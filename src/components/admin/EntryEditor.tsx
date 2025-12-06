import { useState, useEffect } from 'react';
import { ChevronLeft, Save, AlertCircle, Image as ImageIcon, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

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

export default function EntryEditor({ collection, entry, onBack, onSaveSuccess }: Props) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [slugSuffix, setSlugSuffix] = useState(''); // Only the part after collection name
  const [template, setTemplate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Full slug combining collection name + suffix
  const fullSlug = `${collection.slug}/${slugSuffix}`;

  useEffect(() => {
    if (entry) {
      setFormData(entry.data);
      // Extract suffix from full slug (remove collection prefix)
      const suffix = entry.slug.startsWith(`${collection.slug}/`)
        ? entry.slug.substring(`${collection.slug}/`.length)
        : entry.slug;
      setSlugSuffix(suffix);
      setTemplate(entry.template);
    } else {
      // Initialize with empty values
      const initialData: Record<string, any> = {};
      collection.schema.forEach(field => {
        initialData[field.key] = '';
      });
      setFormData(initialData);
      setSlugSuffix('');
      setTemplate(`${collection.slug.charAt(0).toUpperCase() + collection.slug.slice(1)}Layout`);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    // Validation
    for (const field of collection.schema) {
      if (field.required && !formData[field.key]) {
        setError(`${field.label} is required`);
        setSaving(false);
        return;
      }
    }

    if (!slugSuffix) {
      setError('Slug is required');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        collectionId: collection.id,
        slug: fullSlug, // Use the combined full slug
        data: formData,
        template
      };

      const response = entry
        ? await fetch(`/api/entries/${entry.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        : await fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

      if (!response.ok) throw new Error('Failed to save');

      const entryTitle = formData.title || fullSlug;
      toast.success(
        entry ? 'Entry updated successfully!' : 'Entry created successfully!',
        {
          description: `"${entryTitle}" has been saved.`,
        }
      );

      onSaveSuccess();
    } catch (err) {
      setError('Failed to save entry. Please try again.');
      toast.error('Failed to save entry', {
        description: 'Please check your inputs and try again.',
      });
    } finally {
      setSaving(false);
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
          <div className="space-y-3">
            <Textarea
              id={`field-${field.key}`}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder="<p>HTML content...</p>"
              rows={12}
              className="font-mono text-sm resize-y"
              required={field.required}
            />
            <p className="text-xs text-muted-foreground font-medium tracking-wide">
              HTML/Markdown content will be rendered on the page
            </p>
          </div>
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
                disabled
                title="Image upload coming soon"
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
              Enter an image URL or path
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
    <div className="space-y-8">
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
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            {entry ? 'Edit Entry' : 'New Entry'}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-medium tracking-wide capitalize">
            {collection.slug} Collection
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Meta Information Card */}
        <Card className="card-float bg-card border-border/50 overflow-hidden stagger-fade-in stagger-2">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/50" />

          <CardHeader className="bg-gradient-to-br from-muted/20 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <Save className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-serif text-xl sm:text-2xl">Meta Information</CardTitle>
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
                <Input
                  id="template"
                  type="text"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="LayoutName"
                  className="h-11 text-base"
                />
                <p className="text-xs text-muted-foreground font-medium tracking-wide">
                  Astro layout component (e.g., ServiceLayout, BlogLayout)
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
                  <CardTitle className="font-serif text-xl sm:text-2xl">Content</CardTitle>
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
        <div className="flex flex-col-reverse sm:flex-row gap-4 sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 -mx-4 border-t border-border/50 sm:static sm:bg-transparent sm:p-0 sm:border-0 stagger-fade-in stagger-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-full sm:w-auto hover-lift"
            size="lg"
          >
            <span className="font-semibold">Cancel</span>
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto sm:ml-auto bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            <span className="font-semibold">
              {saving ? 'Saving...' : entry ? 'Update Entry' : 'Create Entry'}
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
}
