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

interface ContentModule {
  id: number;
  slug: string;
  name: string;
  schema: Array<{
    label: string;
    type: string;
    key: string;
    required: boolean;
  }>;
  data: Record<string, any>;
}

interface Props {
  module: ContentModule;
  onBack: () => void;
  onSaveSuccess: () => void;
}

export default function ContentModuleContentEditor({ module, onBack, onSaveSuccess }: Props) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFormData(module.data || {});
  }, [module]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    // Validation
    for (const field of module.schema) {
      if (field.required && !formData[field.key]) {
        setError(`${field.label} is required`);
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        slug: module.slug,
        name: module.name,
        schema: module.schema,
        data: formData
      };

      const response = await fetch(`/api/content-modules/${module.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save');

      toast.success('Content updated successfully!', {
        description: `The content for "${module.name}" has been saved.`,
      });

      onSaveSuccess();
    } catch (err) {
      setError('Failed to save content. Please try again.');
      toast.error('Failed to save content', {
        description: 'Please check your inputs and try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: ContentModule['schema'][0]) => {
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
              HTML/Markdown content
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
            Edit Content
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-medium tracking-wide capitalize">
            {module.name}
          </p>
          <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary border border-primary/20">
            {module.slug}
          </Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
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
                  <CardTitle className="font-serif text-xl sm:text-2xl">Content Fields</CardTitle>
                  <CardDescription className="mt-2">
                    Fill in the content for this module
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="font-medium bg-accent/10 text-accent border-accent/30 px-3 py-1.5">
                {module.schema.length} {module.schema.length === 1 ? 'field' : 'fields'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {module.schema.map((field, index) => (
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
              {saving ? 'Saving...' : 'Update Content'}
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
}
