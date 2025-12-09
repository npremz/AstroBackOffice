import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MediaItem {
  id: number;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  uploadedAt: string;
}

export default function MediaLibrary() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [editingAlt, setEditingAlt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = media.filter(item =>
        item.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.alt && item.alt.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredMedia(filtered);
    } else {
      setFilteredMedia(media);
    }
  }, [searchQuery, media]);

  const fetchMedia = async () => {
    try {
      const response = await fetch('/api/media');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setMedia(data);
      setFilteredMedia(data);
    } catch (error) {
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedItems: MediaItem[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/media', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error(`Failed to upload ${file.name}`);
        const newMedia = await response.json();
        uploadedItems.push(newMedia);
      }

      toast.success(`Successfully uploaded ${uploadedItems.length} ${uploadedItems.length === 1 ? 'image' : 'images'}`);
      fetchMedia();
    } catch (error) {
      toast.error('Failed to upload some images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`Delete "${item.originalName}"?`)) return;

    try {
      const response = await fetch(`/api/media/${item.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Image deleted');
      fetchMedia();
      if (selectedMedia?.id === item.id) {
        setSelectedMedia(null);
      }
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  const handleUpdateAlt = async () => {
    if (!selectedMedia) return;

    try {
      const response = await fetch(`/api/media/${selectedMedia.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt: editingAlt })
      });

      if (!response.ok) throw new Error('Failed to update');

      toast.success('Alt text updated');
      fetchMedia();
      setSelectedMedia(null);
    } catch (error) {
      toast.error('Failed to update alt text');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading media library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="stagger-fade-in stagger-1">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Media Library
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground font-medium tracking-wide mt-2">
          Manage your uploaded images and files
        </p>
      </div>

      {/* Upload Card */}
      <Card className="card-float bg-card border-border/50 overflow-hidden stagger-fade-in stagger-2">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/50" />

        <CardHeader className="bg-gradient-to-br from-muted/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold">Upload Media</CardTitle>
              <CardDescription className="mt-1">
                Add images to your media library
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Click to upload images</p>
                    <p className="text-sm text-muted-foreground mt-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                </div>
              </label>
            </div>

            {uploading && (
              <div className="text-center text-sm text-muted-foreground">
                Uploading...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative stagger-fade-in stagger-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by filename or alt text..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Media Grid */}
      <div className="stagger-fade-in stagger-4">
        {filteredMedia.length === 0 ? (
          <Card className="p-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No media found matching your search' : 'No media uploaded yet'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMedia.map((item) => (
              <Card
                key={item.id}
                className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => {
                  setSelectedMedia(item);
                  setEditingAlt(item.alt || '');
                }}
              >
                <div className="aspect-square relative overflow-hidden bg-muted">
                  <img
                    src={item.url}
                    alt={item.alt || item.originalName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium truncate" title={item.originalName}>
                    {item.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(item.size)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Image Details</DialogTitle>
            <DialogDescription>
              View and edit image information
            </DialogDescription>
          </DialogHeader>

          {selectedMedia && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-muted">
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.alt || selectedMedia.originalName}
                  className="w-full h-auto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Filename</p>
                  <p className="mt-1">{selectedMedia.originalName}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Size</p>
                  <p className="mt-1">{formatFileSize(selectedMedia.size)}</p>
                </div>
                {selectedMedia.width && selectedMedia.height && (
                  <div>
                    <p className="font-medium text-muted-foreground">Dimensions</p>
                    <p className="mt-1">{selectedMedia.width} × {selectedMedia.height}</p>
                  </div>
                )}
                <div>
                  <p className="font-medium text-muted-foreground">URL</p>
                  <p className="mt-1 truncate" title={selectedMedia.url}>{selectedMedia.url}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alt-text">Alt Text</Label>
                <Input
                  id="alt-text"
                  value={editingAlt}
                  onChange={(e) => setEditingAlt(e.target.value)}
                  placeholder="Describe this image for accessibility"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMedia(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAlt}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
