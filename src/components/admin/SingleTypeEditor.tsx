import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft, Save, AlertCircle, Package } from 'lucide-react';
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

interface SingleType {
  id?: number;
  slug: string;
  name: string;
  schema: FieldSchema[];
  data?: Record<string, any>;
}

interface Props {
  singleType: SingleType | null;
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

export default function SingleTypeEditor({ singleType, onBack, onSaveSuccess }: Props) {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (singleType) {
      setSlug(singleType.slug);
      setName(singleType.name);
      setFields(singleType.schema);
    } else {
      setSlug('');
      setName('');
      setFields([]);
    }
  }, [singleType]);

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
      setError('Single type slug is required');
      setSaving(false);
      return;
    }

    if (!name) {
      setError('Single type name is required');
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
      // Initialize data with empty values for new modules
      const initialData: Record<string, any> = {};
      fields.forEach(field => {
        initialData[field.key] = '';
      });

      const payload = {
        slug,
        name,
        schema: fields,
        data: singleType?.data || initialData
      };

      const response = singleType
        ? await fetch(`/api/content-modules/${singleType.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        : await fetch('/api/content-modules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

      if (!response.ok) throw new Error('Failed to save');

      toast.success(
        singleType ? 'Single type updated successfully!' : 'Single type created successfully!',
        {
          description: `The single type "${name}" has been saved.`,
        }
      );

      onSaveSuccess();
    } catch (err) {
      setError('Failed to save single type. Please try again.');
      toast.error('Failed to save single type', {
        description: 'Please check your inputs and try again.',
      });
    } finally {
      setSaving(false);
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
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {singleType ? 'Edit Single Type Schema' : 'New Single Type'}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-medium tracking-wide max-w-2xl">
            Define the structure and fields for this single type
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Module Details Card */}
        <Card className="card-float bg-card border-border/50 overflow-hidden stagger-fade-in stagger-2">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/50" />

          <CardHeader className="bg-gradient-to-br from-muted/20 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold">Single Type Details</CardTitle>
                <CardDescription className="mt-1">
                  Set the unique identifier and name for this single type
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-semibold tracking-wide">
                Single Type Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // Auto-generate slug from name (only for new single types)
                  if (!singleType) {
                    const generatedSlug = e.target.value.toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '');
                    setSlug(generatedSlug);
                  }
                }}
                placeholder="e.g., About Us Section"
                required
                className="h-11 text-base"
              />
              <p className="text-xs text-muted-foreground font-medium tracking-wide">
                Friendly name shown in admin panel
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="slug" className="text-sm font-semibold tracking-wide">
                Single Type Slug <span className="text-xs text-muted-foreground font-normal">(auto)</span>
              </Label>
              <Input
                id="slug"
                type="text"
                value={slug}
                readOnly={!singleType}
                onChange={(e) => singleType && setSlug(e.target.value)}
                placeholder="e.g., about-us, hero-home"
                required
                className={`h-11 text-base font-mono text-sm ${!singleType ? 'bg-muted/50' : ''}`}
              />
              <p className="text-xs text-muted-foreground font-medium tracking-wide">
                Used in code: getContentModule('{slug || 'about-us'}')
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Schema Builder Card - Same as CollectionEditor */}
        <Card className="card-float bg-card border-border/50 overflow-hidden stagger-fade-in stagger-3">
          <div className="h-1 w-full bg-gradient-to-r from-accent via-primary to-accent/50" />

          <CardHeader className="bg-gradient-to-br from-muted/20 to-transparent">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-accent/10 to-primary/10">
                  <Plus className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-bold">Schema Fields</CardTitle>
                  <CardDescription className="mt-2">
                    Define the content fields for this single type
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleAddField}
                size="lg"
                className="w-full sm:w-auto bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="font-semibold">Add Field</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border/50 rounded-xl bg-gradient-to-br from-muted/20 to-background">
                <p className="text-sm sm:text-base text-muted-foreground mb-6 text-center leading-relaxed">
                  No fields yet. Add your first field to get started.
                </p>
                <Button
                  type="button"
                  onClick={handleAddField}
                  variant="outline"
                  size="lg"
                  className="hover-lift"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="font-semibold">Add First Field</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {fields.map((field, index) => (
                  <div
                    key={index}
                    className={`rounded-xl border border-border/50 bg-gradient-to-br from-muted/10 to-background p-5 sm:p-6 space-y-5 stagger-fade-in stagger-${Math.min(index + 4, 8)}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge
                        variant="outline"
                        className="font-medium bg-accent/10 text-accent border-accent/30 px-3 py-1.5"
                      >
                        Field {index + 1}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(index)}
                        className="hover-lift hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        <span className="font-semibold">Remove</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-3 sm:col-span-2">
                        <Label htmlFor={`field-label-${index}`} className="text-sm font-semibold tracking-wide">
                          Field Label <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`field-label-${index}`}
                          type="text"
                          value={field.label}
                          onChange={(e) => handleFieldChange(index, { label: e.target.value })}
                          placeholder="e.g., Hero Title"
                          required
                          className="h-11 text-base"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor={`field-type-${index}`} className="text-sm font-semibold tracking-wide">
                          Field Type
                        </Label>
                        <Select
                          value={field.type}
                          onValueChange={(value) => handleFieldChange(index, { type: value })}
                        >
                          <SelectTrigger id={`field-type-${index}`} className="h-11">
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

                      <div className="space-y-3">
                        <Label htmlFor={`field-key-${index}`} className="text-sm font-semibold tracking-wide">
                          Field Key <span className="text-xs text-muted-foreground font-normal">(auto)</span>
                        </Label>
                        <Input
                          id={`field-key-${index}`}
                          type="text"
                          value={field.key}
                          readOnly
                          className="bg-muted/50 h-11 font-mono text-sm"
                        />
                      </div>

                      <div className="flex items-center space-x-3 pt-6">
                        <Checkbox
                          id={`field-required-${index}`}
                          checked={field.required}
                          onCheckedChange={(checked) =>
                            handleFieldChange(index, { required: checked as boolean })
                          }
                        />
                        <Label
                          htmlFor={`field-required-${index}`}
                          className="text-sm font-medium cursor-pointer"
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
          <Alert variant="destructive" className="stagger-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-medium">{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-4 stagger-fade-in stagger-4">
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
            className="w-full sm:w-auto sm:ml-auto bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            <span className="font-semibold">
              {saving ? 'Saving...' : singleType ? 'Update Single Type' : 'Create Single Type'}
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
}
