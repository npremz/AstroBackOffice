import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Edit, Trash2, ChevronLeft, ExternalLink, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiDelete } from '@/lib/api-client';
import EntriesSearch, { type SearchFilters } from './EntriesSearch';

interface Collection {
  id: number;
  slug: string;
  schema: any[];
}

interface Entry {
  id: number;
  collectionId: number;
  slug: string;
  data: Record<string, any>;
  template: string;
  publishedAt: Date;
}

interface EntryWithDraft extends Entry {
  hasDraft?: boolean;
  isPublished?: boolean;
}

interface Props {
  collection: Collection;
  onBack: () => void;
  onCreate: () => void;
  onEdit: (entry: Entry) => void;
  onEditSchema: (collection: Collection) => void;
}

export default function EntriesList({ collection, onBack, onCreate, onEdit, onEditSchema }: Props) {
  const [entries, setEntries] = useState<EntryWithDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    q: '',
    sortBy: 'publishedAt',
    sortOrder: 'desc',
  });
  const [totalCount, setTotalCount] = useState(0);
  const [availableTemplates, setAvailableTemplates] = useState<string[]>([]);

  useEffect(() => {
    fetchEntries();
  }, [collection.id, searchFilters]);

  const fetchEntries = async () => {
    setLoading(true);
    
    // Build search URL with filters
    const params = new URLSearchParams();
    params.set('collectionId', collection.id.toString());
    
    if (searchFilters.q) {
      params.set('q', searchFilters.q);
    }
    if (searchFilters.sortBy) {
      params.set('sortBy', searchFilters.sortBy);
    }
    if (searchFilters.sortOrder) {
      params.set('sortOrder', searchFilters.sortOrder);
    }
    if (searchFilters.template) {
      params.set('template', searchFilters.template);
    }
    if (searchFilters.publishedAfter) {
      params.set('publishedAfter', searchFilters.publishedAfter);
    }
    if (searchFilters.publishedBefore) {
      params.set('publishedBefore', searchFilters.publishedBefore);
    }

    const response = await fetch(`/api/entries/search?${params.toString()}`);
    const result = await response.json();
    const data: Entry[] = result.data || [];
    setTotalCount(result.pagination?.total || data.length);

    // Extract unique templates for filter dropdown
    const templates = [...new Set(data.map(e => e.template))].filter(Boolean);
    setAvailableTemplates(templates);

    // Check for drafts for each entry
    const entriesWithDraftStatus = await Promise.all(
      data.map(async (entry) => {
        const isPublished = new Date(entry.publishedAt).getTime() > 0;
        let hasDraft = false;

        // Check if there's a draft for this entry
        try {
          const draftResponse = await fetch(`/api/entries/${entry.id}/draft`);
          hasDraft = draftResponse.ok;
        } catch {
          hasDraft = false;
        }

        return { ...entry, hasDraft, isPublished };
      })
    );

    setEntries(entriesWithDraftStatus);
    setLoading(false);
  };

  const handleSearch = useCallback((filters: SearchFilters) => {
    setSearchFilters(filters);
  }, []);

  const handleDeleteClick = (entry: Entry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;

    setDeleting(true);
    try {
      await apiDelete(`/api/entries/${entryToDelete.id}`);

      toast.success('Entry deleted successfully!', {
        description: `"${entryToDelete.data.title || entryToDelete.slug}" has been removed.`,
      });

      fetchEntries();
    } catch (err) {
      toast.error('Failed to delete entry', {
        description: 'Please try again later.',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const publishedCount = entries.filter(e => e.isPublished).length;
  const draftCount = entries.filter(e => e.hasDraft).length;

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
          <h2 className="text-3xl sm:text-4xl font-bold capitalize tracking-tight text-foreground">
            {collection.slug}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-medium tracking-wide max-w-2xl">
            Manage and organize entries in your collection
          </p>
        </div>
      </div>

      {/* Mobile Actions - Show on mobile/tablet */}
      <div className="lg:hidden flex flex-col gap-3 stagger-fade-in stagger-2">
        <Button
          onClick={onCreate}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="font-semibold">New Entry</span>
        </Button>
        <Button
          onClick={() => onEditSchema(collection)}
          variant="outline"
          className="w-full border-border/50 hover:bg-accent/10 hover:border-accent/50 transition-all duration-200"
          size="lg"
        >
          <Settings className="h-4 w-4 mr-2" />
          <span className="font-semibold">Edit Schema</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="stagger-fade-in stagger-2">
        <EntriesSearch
          onSearch={handleSearch}
          templates={availableTemplates}
          loading={loading}
          resultCount={totalCount}
        />
      </div>

      {/* Two column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        {/* Main Content Area */}
        <div className="space-y-6">
          {/* Loading State */}
          {loading ? (
            <Card className="card-float stagger-fade-in stagger-2">
              <CardContent className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="font-medium">Loading entries...</span>
                </div>
              </CardContent>
            </Card>
          ) : entries.length === 0 ? (
            /* Empty State */
            <Card className="border-dashed border-2 border-border/50 bg-gradient-to-br from-muted/30 to-background stagger-fade-in stagger-2">
              <CardContent className="flex flex-col items-center justify-center py-16 px-4">
                <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-primary/10 p-6 mb-6">
                  <FileText className="h-12 w-12 text-accent" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No entries yet</h3>
                <p className="text-sm sm:text-base text-muted-foreground text-center mb-8 max-w-md leading-relaxed">
                  Create your first entry in the <span className="font-semibold text-foreground">{collection.slug}</span> collection
                </p>
                <Button
                  onClick={onCreate}
                  size="lg"
                  className="bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="font-semibold">Create your first entry</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Entries List */
            entries.map((entry, index) => (
              <Card
                key={entry.id}
                className={`group card-float bg-card border-border/50 overflow-hidden stagger-fade-in stagger-${Math.min(index + 2, 8)}`}
              >
                {/* Accent border */}
                <div className="h-1 w-full bg-gradient-to-r from-accent via-primary to-accent/50" />

                <CardHeader className="pb-4 bg-gradient-to-br from-muted/20 to-transparent">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-3">
                      <CardTitle className="text-xl sm:text-2xl font-bold truncate flex items-center gap-3 group-hover:text-accent transition-colors duration-200">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-accent/10 to-primary/10 group-hover:from-accent/20 group-hover:to-primary/20 transition-all duration-300">
                          <FileText className="h-5 w-5 flex-shrink-0 text-accent" />
                        </div>
                        <span className="tracking-tight">{entry.data.title || entry.slug}</span>
                      </CardTitle>
                      <CardDescription className="flex flex-wrap gap-3 items-center">
                        <Badge variant="secondary" className="font-mono text-xs bg-accent/10 text-accent border border-accent/20 px-3 py-1">
                          /{entry.slug}
                        </Badge>
                        {entry.hasDraft && (
                          <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1">
                            Draft
                          </Badge>
                        )}
                        {entry.isPublished && (
                          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1">
                            Published
                          </Badge>
                        )}
                        {entry.publishedAt && entry.isPublished && (
                          <span className="text-xs font-medium text-muted-foreground tracking-wide">
                            {formatDate(entry.publishedAt)}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                {/* Entry Preview */}
                <CardContent className="pb-4">
                  <div className="space-y-3 bg-gradient-to-br from-muted/20 to-muted/5 rounded-xl p-4 border border-border/30">
                    {Object.entries(entry.data)
                      .slice(0, 2)
                      .map(([key, value]) => (
                        <div key={key} className="text-sm space-y-1">
                          <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground/70">
                            {key}
                          </span>
                          <p className="line-clamp-2 text-foreground/90 leading-relaxed">
                            {typeof value === 'string' && value.length > 150
                              ? value.substring(0, 150) + '...'
                              : String(value)}
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>

                <CardFooter className="flex flex-wrap gap-3 pt-4 border-t border-border/30 bg-gradient-to-br from-muted/10 to-transparent">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 sm:flex-none bg-accent hover:bg-accent/90 shadow-md hover:shadow-lg transition-all duration-200"
                    onClick={() => onEdit(entry)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-2" />
                    <span className="font-semibold">Edit</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none border-primary/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                    asChild
                  >
                    <a href={`/${entry.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      <span className="font-semibold">View</span>
                    </a>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="shadow-md hover:shadow-lg transition-all duration-200"
                    onClick={() => handleDeleteClick(entry)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:ml-2 font-semibold">Delete</span>
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>

        {/* Right Sidebar - Desktop Only */}
        <div className="hidden lg:block">
          <div className="space-y-6 stagger-fade-in stagger-3">
            {/* Collection Info Card */}
            <Card className="card-float bg-card border-border/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Collection Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Name</p>
                  <p className="text-sm font-medium capitalize">{collection.slug}</p>
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-semibold text-muted-foreground">Schema Fields</p>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
                    {collection.schema.length} {collection.schema.length === 1 ? 'field' : 'fields'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            {!loading && entries.length > 0 && (
              <Card className="card-float bg-card border-border/50 overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold">Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-muted/20 to-background border border-border/30">
                      <span className="text-sm font-medium text-muted-foreground">Total Entries</span>
                      <span className="text-2xl font-bold text-foreground">{entries.length}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-green-500/5 to-background border border-green-500/20">
                      <span className="text-sm font-medium text-muted-foreground">Published</span>
                      <span className="text-2xl font-bold text-green-600">{publishedCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-amber-500/5 to-background border border-amber-500/20">
                      <span className="text-sm font-medium text-muted-foreground">Drafts</span>
                      <span className="text-2xl font-bold text-amber-600">{draftCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions Card - Sticky */}
            <div className="sticky top-8">
              <Card className="card-float bg-card border-border/50 overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={onCreate}
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
                    size="lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="font-semibold">New Entry</span>
                  </Button>
                  <Button
                    onClick={() => onEditSchema(collection)}
                    variant="outline"
                    className="w-full border-border/50 hover:bg-accent/10 hover:border-accent/50 transition-all duration-200"
                    size="lg"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    <span className="font-semibold">Edit Schema</span>
                  </Button>
                  <Button
                    onClick={onBack}
                    variant="ghost"
                    className="w-full hover-lift"
                    size="lg"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    <span className="font-semibold">Back</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Delete Entry</DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-2">
              Are you sure you want to delete "<span className="font-semibold text-foreground">{entryToDelete?.data.title || entryToDelete?.slug}</span>"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="hover-lift"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="shadow-md hover:shadow-lg transition-all duration-200"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <span className="font-semibold">Delete</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
