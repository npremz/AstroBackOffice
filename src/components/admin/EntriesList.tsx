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
            <h2 className="capitalize">
              {collection.slug}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage entries in this collection
            </p>
          </div>
        </div>
        <Button onClick={onCreate} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      {/* Loading State */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading entries...</span>
            </div>
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        /* Empty State */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2">No entries yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
              Create your first entry in the {collection.slug} collection
            </p>
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Entries List - Mobile First */
        <>
          <div className="grid grid-cols-1 gap-4">
            {entries.map((entry) => (
              <Card
                key={entry.id}
                className="group hover:shadow-xl hover:border-green-400 transition-all duration-200 cursor-pointer border-l-4 border-l-green-500"
              >
                <CardHeader className="pb-3 bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-950/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/30">
                          <FileText className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                        </div>
                        {entry.data.title || entry.slug}
                      </CardTitle>
                      <CardDescription className="mt-1.5 flex flex-wrap gap-2 items-center">
                        <Badge variant="secondary" className="font-mono text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          /{entry.slug}
                        </Badge>
                        {entry.publishedAt && (
                          <span className="text-xs">
                            {formatDate(entry.publishedAt)}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                {/* Entry Preview - Show first few fields */}
                <CardContent className="pb-3">
                  <div className="space-y-2 bg-muted/30 rounded-md p-3">
                    {Object.entries(entry.data)
                      .slice(0, 2)
                      .map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-muted-foreground capitalize font-medium">
                            {key}:
                          </span>{' '}
                          <span className="line-clamp-1">
                            {typeof value === 'string' && value.length > 100
                              ? value.substring(0, 100) + '...'
                              : String(value)}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>

                <CardFooter className="flex flex-wrap gap-2 pt-3 border-t bg-muted/30">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                    onClick={() => onEdit(entry)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30"
                    asChild
                  >
                    <a href={`/${entry.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      View
                    </a>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => handleDeleteClick(entry)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:ml-1.5">Delete</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Stats */}
          <div className="rounded-lg border bg-card text-card-foreground p-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Total Entries:</span>
              <span className="font-semibold">{entries.length}</span>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{entryToDelete?.data.title || entryToDelete?.slug}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
