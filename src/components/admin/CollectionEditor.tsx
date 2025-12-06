import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft, Save, AlertCircle, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface FieldSchema {
  label: string;
  type: string;
  key: string;
  required: boolean;
}

interface Collection {
  id?: number;
  slug: string;
  schema: FieldSchema[];
}

interface Props {
  collection: Collection | null;
  onBack: () => void;
  onSaveSuccess: () => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'richtext', label: 'Rich Text (HTML)' },
  { value: 'image', label: 'Image URL' },
];

export default function CollectionEditor({ collection, onBack, onSaveSuccess }: Props) {
  const [slug, setSlug] = useState('');
  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (collection) {
      setSlug(collection.slug);
      setFields(collection.schema);
    } else {
      setSlug('');
      setFields([]);
    }
  }, [collection]);

  const handleAddField = () => {
    setFields([...fields, {
      label: '',
      type: 'text',
      key: '',
      required: false
    }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: Partial<FieldSchema>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...field };

    // Auto-generate key from label
    if (field.label !== undefined) {
      const key = field.label.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
      newFields[index].key = key;
    }

    setFields(newFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    // Validation
    if (!slug) {
      setError('Collection slug is required');
      setSaving(false);
      return;
    }

    if (fields.length === 0) {
      setError('At least one field is required');
      setSaving(false);
      return;
    }

    for (const field of fields) {
      if (!field.label || !field.key) {
        setError('All fields must have a label');
        setSaving(false);
        return;
      }
    }

    try {
      const payload = { slug, schema: fields };

      const response = collection
        ? await fetch(`/api/collections/${collection.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        : await fetch('/api/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

      if (!response.ok) throw new Error('Failed to save');

      toast.success(
        collection ? 'Collection updated successfully!' : 'Collection created successfully!',
        {
          description: `The collection "${slug}" has been saved.`,
        }
      );

      onSaveSuccess();
    } catch (err) {
      setError('Failed to save collection. Please try again.');
      toast.error('Failed to save collection', {
        description: 'Please check your inputs and try again.',
      });
    } finally {
      setSaving(false);
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
              {collection ? 'Edit Collection' : 'New Collection'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Define the structure for your content
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Collection Slug Card */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/20">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
                <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Collection Details</CardTitle>
                <CardDescription>
                  Set the unique identifier for this collection
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug">
                Collection Slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., products, blog-posts"
                required
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Schema Builder Card */}
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30">
                  <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle>Schema Fields</CardTitle>
                  <CardDescription className="mt-1.5">
                    Define the fields for entries in this collection
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleAddField}
                size="sm"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground mb-4">
                  No fields yet. Add your first field to get started.
                </p>
                <Button
                  type="button"
                  onClick={handleAddField}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Field
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-indigo-200 bg-indigo-50/30 dark:border-indigo-800 dark:bg-indigo-950/20 p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300">
                        Field {index + 1}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Field Label */}
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`field-label-${index}`}>
                          Field Label <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`field-label-${index}`}
                          type="text"
                          value={field.label}
                          onChange={(e) => handleFieldChange(index, { label: e.target.value })}
                          placeholder="e.g., Product Name"
                          required
                        />
                      </div>

                      {/* Field Type */}
                      <div className="space-y-2">
                        <Label htmlFor={`field-type-${index}`}>Field Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) => handleFieldChange(index, { type: value })}
                        >
                          <SelectTrigger id={`field-type-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Field Key (auto-generated) */}
                      <div className="space-y-2">
                        <Label htmlFor={`field-key-${index}`}>
                          Field Key <span className="text-xs text-muted-foreground">(auto)</span>
                        </Label>
                        <Input
                          id={`field-key-${index}`}
                          type="text"
                          value={field.key}
                          readOnly
                          className="bg-muted"
                        />
                      </div>

                      {/* Required Checkbox */}
                      <div className="flex items-center space-x-2 pt-6">
                        <Checkbox
                          id={`field-required-${index}`}
                          checked={field.required}
                          onCheckedChange={(checked) =>
                            handleFieldChange(index, { required: checked as boolean })
                          }
                        />
                        <Label
                          htmlFor={`field-required-${index}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          Required field
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
        <div className="flex flex-col-reverse sm:flex-row gap-3">
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
            className="w-full sm:w-auto sm:ml-auto bg-purple-600 hover:bg-purple-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : collection ? 'Update Collection' : 'Create Collection'}
          </Button>
        </div>
      </form>
    </div>
  );
}
