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
import RichTextEditor from './RichTextEditor';
import MediaPicker from './MediaPicker';
import DocumentPicker from './DocumentPicker';
import { apiPut } from '@/lib/api-client';

interface SingleType {
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
  singleType: SingleType;
  onBack: () => void;
  onSaveSuccess: () => void;
}

export default function SingleTypeContentEditor({ singleType, onBack, onSaveSuccess }: Props) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [currentImageField, setCurrentImageField] = useState<string | null>(null);
  const [documentPickerOpen, setDocumentPickerOpen] = useState(false);
  const [currentDocumentField, setCurrentDocumentField] = useState<string | null>(null);

  useEffect(() => {
    setFormData(singleType.data || {});
  }, [singleType]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    // Validation
    for (const field of singleType.schema) {
      if (field.required && !formData[field.key]) {
        setError(`${field.label} is required`);
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        slug: singleType.slug,
        name: singleType.name,
        schema: singleType.schema,
        data: formData
      };

      await apiPut(`/api/content-modules/${singleType.id}`, payload);

      toast.success('Content updated successfully!', {
        description: `The content for "${singleType.name}" has been saved.`,
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

  const renderField = (field: SingleType['schema'][0]) => {
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
            Edit Content
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-medium tracking-wide capitalize">
            {singleType.name}
          </p>
        </div>
      </div>

      {/* Two column layout on desktop */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
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
                    <CardTitle className="text-xl sm:text-2xl font-bold">Content Fields</CardTitle>
                    <CardDescription className="mt-2">
                      Fill in the content for this single type
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="font-medium bg-accent/10 text-accent border-accent/30 px-3 py-1.5">
                  {singleType.schema.length} {singleType.schema.length === 1 ? 'field' : 'fields'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {singleType.schema.map((field, index) => (
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

          {/* Mobile Actions - Sticky Bottom */}
          <div className="lg:hidden flex flex-col gap-3 sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 -mx-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="hover-lift"
              size="lg"
            >
              <span className="font-semibold">Cancel</span>
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              <span className="font-semibold">
                {saving ? 'Saving...' : 'Update Content'}
              </span>
            </Button>
          </div>
        </div>

        {/* Right Sidebar - Desktop Only */}
        <div className="hidden lg:block">
          <div className="space-y-6 stagger-fade-in stagger-3">
            {/* Info Card */}
            <Card className="card-float bg-card border-border/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Single Type Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{singleType.name}</p>
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-semibold text-muted-foreground">Slug</p>
                  <Badge variant="secondary" className="font-mono text-xs bg-primary/10 text-primary border border-primary/20">
                    {singleType.slug}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Actions Card - Sticky when scrolling */}
            <div className="sticky top-8">
              <Card className="card-float bg-card border-border/50 overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
                    size="lg"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    <span className="font-semibold">
                      {saving ? 'Saving...' : 'Update Content'}
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
      </form>

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

      {/* Document Picker Dialog */}
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
