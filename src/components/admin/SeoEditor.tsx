import { useState } from 'react';
import { Search, Globe, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import MediaPicker from './MediaPicker';

export interface SeoMetadata {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
}

interface Props {
  seo: SeoMetadata;
  onChange: (seo: SeoMetadata) => void;
  defaultTitle?: string;
  defaultDescription?: string;
}

export default function SeoEditor({ seo, onChange, defaultTitle = '', defaultDescription = '' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const handleChange = (key: keyof SeoMetadata, value: string | boolean) => {
    onChange({ ...seo, [key]: value });
  };

  // Calculate character counts
  const metaTitleLength = (seo.metaTitle || '').length;
  const metaDescriptionLength = (seo.metaDescription || '').length;

  // Get effective values (with fallbacks)
  const effectiveTitle = seo.metaTitle || defaultTitle;
  const effectiveDescription = seo.metaDescription || defaultDescription;

  return (
    <Card className="card-float bg-card border-border/50 overflow-hidden">
      <CardHeader 
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10">
              <Search className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">SEO Settings</CardTitle>
              <CardDescription className="mt-1">
                Search engine optimization
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(seo.noIndex || seo.noFollow) && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                {seo.noIndex && seo.noFollow ? 'NoIndex, NoFollow' : seo.noIndex ? 'NoIndex' : 'NoFollow'}
              </Badge>
            )}
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 pt-2">
          {/* Google Preview */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Google Preview</p>
            <div className="space-y-1">
              <p className="text-blue-600 text-lg font-medium truncate hover:underline cursor-pointer">
                {effectiveTitle || 'Page Title'}
              </p>
              <p className="text-green-700 text-sm truncate">
                example.com › page-slug
              </p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {effectiveDescription || 'Page description will appear here...'}
              </p>
            </div>
          </div>

          {/* Meta Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="metaTitle" className="text-sm font-semibold">
                Meta Title
              </Label>
              <span className={`text-xs ${metaTitleLength > 60 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {metaTitleLength}/70
              </span>
            </div>
            <Input
              id="metaTitle"
              value={seo.metaTitle || ''}
              onChange={(e) => handleChange('metaTitle', e.target.value)}
              placeholder={defaultTitle || 'Enter meta title...'}
              maxLength={70}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 50-60 characters. Leave empty to use content title.
            </p>
          </div>

          {/* Meta Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="metaDescription" className="text-sm font-semibold">
                Meta Description
              </Label>
              <span className={`text-xs ${metaDescriptionLength > 155 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                {metaDescriptionLength}/160
              </span>
            </div>
            <Textarea
              id="metaDescription"
              value={seo.metaDescription || ''}
              onChange={(e) => handleChange('metaDescription', e.target.value)}
              placeholder={defaultDescription || 'Enter meta description...'}
              maxLength={160}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 150-160 characters for optimal display in search results.
            </p>
          </div>

          {/* Open Graph Section */}
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Social Media (Open Graph)</span>
            </div>

            <div className="space-y-4">
              {/* OG Title */}
              <div className="space-y-2">
                <Label htmlFor="ogTitle" className="text-sm font-medium">
                  OG Title
                </Label>
                <Input
                  id="ogTitle"
                  value={seo.ogTitle || ''}
                  onChange={(e) => handleChange('ogTitle', e.target.value)}
                  placeholder="Leave empty to use meta title"
                  maxLength={70}
                  className="h-10"
                />
              </div>

              {/* OG Description */}
              <div className="space-y-2">
                <Label htmlFor="ogDescription" className="text-sm font-medium">
                  OG Description
                </Label>
                <Textarea
                  id="ogDescription"
                  value={seo.ogDescription || ''}
                  onChange={(e) => handleChange('ogDescription', e.target.value)}
                  placeholder="Leave empty to use meta description"
                  maxLength={200}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* OG Image */}
              <div className="space-y-2">
                <Label htmlFor="ogImage" className="text-sm font-medium">
                  OG Image
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="ogImage"
                    value={seo.ogImage || ''}
                    onChange={(e) => handleChange('ogImage', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setMediaPickerOpen(true)}
                    className="h-10 w-10"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
                {seo.ogImage && (
                  <div className="mt-2 rounded-lg border border-border/50 overflow-hidden">
                    <img
                      src={seo.ogImage}
                      alt="OG Preview"
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Recommended: 1200x630px for optimal social sharing.
                </p>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-sm font-semibold mb-4">Advanced Settings</p>

            <div className="space-y-4">
              {/* Canonical URL */}
              <div className="space-y-2">
                <Label htmlFor="canonicalUrl" className="text-sm font-medium">
                  Canonical URL
                </Label>
                <Input
                  id="canonicalUrl"
                  value={seo.canonicalUrl || ''}
                  onChange={(e) => handleChange('canonicalUrl', e.target.value)}
                  placeholder="https://example.com/original-page"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the page URL. Use to prevent duplicate content issues.
                </p>
              </div>

              {/* Robot directives */}
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="noIndex" className="text-sm font-medium">
                      NoIndex
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Hide from search engines
                    </p>
                  </div>
                  <Switch
                    id="noIndex"
                    checked={seo.noIndex || false}
                    onCheckedChange={(checked) => handleChange('noIndex', checked)}
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="noFollow" className="text-sm font-medium">
                      NoFollow
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Don't follow links
                    </p>
                  </div>
                  <Switch
                    id="noFollow"
                    checked={seo.noFollow || false}
                    onCheckedChange={(checked) => handleChange('noFollow', checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}

      <MediaPicker
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={(url) => handleChange('ogImage', url)}
        currentValue={seo.ogImage || ''}
      />
    </Card>
  );
}
