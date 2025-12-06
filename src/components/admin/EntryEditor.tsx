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
          />
        );

      case 'textarea':
        return (
          <Textarea
            id={`field-${field.key}`}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            rows={4}
            required={field.required}
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
          />
        );

      case 'richtext':
        return (
          <div className="space-y-2">
            <Textarea
              id={`field-${field.key}`}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder="<p>HTML content...</p>"
              rows={10}
              className="font-mono text-sm"
              required={field.required}
            />
            <p className="text-xs text-muted-foreground">
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
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled
                title="Image upload coming soon"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
            {value && (
              <div className="rounded-lg border p-2 bg-muted/50">
                <img
                  src={value}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
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
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - Mobile First */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="hidden md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2>
              {entry ? 'Edit Entry' : 'New Entry'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              {collection.slug}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meta Information Card */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30">
                <Save className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle>Meta Information</CardTitle>
                <CardDescription>
                  Configure URL and template settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Slug with collection prefix */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="slugSuffix">
                  Slug <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-muted px-3 py-2 rounded-md border border-input text-sm text-muted-foreground font-mono">
                    {collection.slug}/
                  </div>
                  <Input
                    id="slugSuffix"
                    type="text"
                    value={slugSuffix}
                    onChange={(e) => setSlugSuffix(e.target.value)}
                    placeholder="my-entry"
                    required
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  URL path: <code className="bg-muted px-1 rounded">/{fullSlug}</code>
                </p>
              </div>

              {/* Template */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="template">Template</Label>
                <Input
                  id="template"
                  type="text"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="LayoutName"
                />
                <p className="text-xs text-muted-foreground">
                  Astro layout component (e.g., ServiceLayout, BlogLayout)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Fields Card */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle>Content</CardTitle>
                  <CardDescription className="mt-1.5">
                    Fill in the fields for this entry
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300">
                {collection.schema.length} {collection.schema.length === 1 ? 'field' : 'fields'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {collection.schema.map((field) => (
              <div key={field.key} className="space-y-2 p-4 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30">
                <Label htmlFor={`field-${field.key}`} className="flex items-center gap-2">
                  <span>{field.label}</span>
                  {field.required && <span className="text-destructive">*</span>}
                  <Badge variant="secondary" className="ml-auto text-xs font-normal bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    {field.type}
                  </Badge>
                </Label>
                {renderField(field)}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions - Mobile First */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sticky bottom-4 bg-background p-4 -mx-4 border-t sm:static sm:bg-transparent sm:p-0 sm:border-0">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto sm:ml-auto bg-emerald-600 hover:bg-emerald-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : entry ? 'Update Entry' : 'Create Entry'}
          </Button>
        </div>
      </form>
    </div>
  );
}
