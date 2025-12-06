import { useState, useEffect } from 'react';
import { Plus, FileText, Edit, Trash2, ChevronLeft, ExternalLink, Loader2 } from 'lucide-react';
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

interface Props {
  collection: Collection;
  onBack: () => void;
  onCreate: () => void;
  onEdit: (entry: Entry) => void;
}

export default function EntriesList({ collection, onBack, onCreate, onEdit }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, [collection.id]);

  const fetchEntries = async () => {
    setLoading(true);
    const response = await fetch(`/api/entries?collectionId=${collection.id}`);
    const data = await response.json();
    setEntries(data);
    setLoading(false);
  };

  const handleDeleteClick = (entry: Entry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/entries/${entryToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');

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

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between stagger-fade-in stagger-1">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="hidden md:flex hover-lift mt-1"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-2">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold capitalize tracking-tight text-foreground">
              {collection.slug}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground font-medium tracking-wide max-w-2xl">
              Manage and organize entries in your collection
            </p>
          </div>
        </div>
        <Button
          onClick={onCreate}
          className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="font-semibold">New Entry</span>
        </Button>
      </div>

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
            <h3 className="font-serif text-2xl font-semibold mb-2">No entries yet</h3>
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
        /* Entries List - Editorial Layout */
        <>
          <div className="grid grid-cols-1 gap-6">
            {entries.map((entry, index) => (
              <Card
                key={entry.id}
                className={`group card-float bg-card border-border/50 overflow-hidden stagger-fade-in stagger-${Math.min(index + 2, 8)}`}
              >
                {/* Accent border */}
                <div className="h-1 w-full bg-gradient-to-r from-accent via-primary to-accent/50" />

                <CardHeader className="pb-4 bg-gradient-to-br from-muted/20 to-transparent">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-3">
                      <CardTitle className="font-serif text-xl sm:text-2xl truncate flex items-center gap-3 group-hover:text-accent transition-colors duration-200">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-accent/10 to-primary/10 group-hover:from-accent/20 group-hover:to-primary/20 transition-all duration-300">
                          <FileText className="h-5 w-5 flex-shrink-0 text-accent" />
                        </div>
                        <span className="tracking-tight">{entry.data.title || entry.slug}</span>
                      </CardTitle>
                      <CardDescription className="flex flex-wrap gap-3 items-center">
                        <Badge variant="secondary" className="font-mono text-xs bg-accent/10 text-accent border border-accent/20 px-3 py-1">
                          /{entry.slug}
                        </Badge>
                        {entry.publishedAt && (
                          <span className="text-xs font-medium text-muted-foreground tracking-wide">
                            Published {formatDate(entry.publishedAt)}
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
            ))}
          </div>

          {/* Editorial Stats */}
          <div className={`rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-6 sm:p-8 card-float stagger-fade-in stagger-${Math.min(entries.length + 2, 8)}`}>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-accent to-accent/50" />
              <span className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                Total Entries
              </span>
              <p className="font-numbers text-3xl sm:text-4xl text-foreground ml-auto">
                {entries.length}
              </p>
            </div>
          </div>
        </>
      )}

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
