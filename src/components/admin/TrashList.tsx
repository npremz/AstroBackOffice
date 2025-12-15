import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, ChevronLeft, Loader2, FileText } from 'lucide-react';
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
import { apiPost, apiDelete } from '@/lib/api-client';

interface Entry {
  id: number;
  collectionId: number;
  slug: string;
  data: Record<string, any>;
  template: string;
  publishedAt: Date;
  deletedAt: Date;
}

interface Props {
  onBack: () => void;
}

export default function TrashList({ onBack }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchTrash();
  }, []);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/entries/trash');
      const result = await response.json();
      setEntries(result.data || []);
    } catch (error) {
      toast.error('Failed to load trash');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = (entry: Entry) => {
    setSelectedEntry(entry);
    setRestoreDialogOpen(true);
  };

  const handleDeleteClick = (entry: Entry) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!selectedEntry) return;

    setProcessing(true);
    try {
      await apiPost(`/api/entries/${selectedEntry.id}/restore`, {});

      toast.success('Entry restored!', {
        description: `"${selectedEntry.data.title || selectedEntry.slug}" has been restored.`,
      });

      fetchTrash();
    } catch (err) {
      toast.error('Failed to restore entry');
    } finally {
      setProcessing(false);
      setRestoreDialogOpen(false);
      setSelectedEntry(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedEntry) return;

    setProcessing(true);
    try {
      await apiDelete(`/api/entries/${selectedEntry.id}?permanent=true`);

      toast.success('Entry permanently deleted', {
        description: `"${selectedEntry.data.title || selectedEntry.slug}" has been permanently removed.`,
      });

      fetchTrash();
    } catch (err) {
      toast.error('Failed to delete entry');
    } finally {
      setProcessing(false);
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
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
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Trash2 className="h-8 w-8 text-muted-foreground" />
            Trash
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-medium tracking-wide max-w-2xl">
            Deleted entries can be restored or permanently removed
          </p>
        </div>
      </div>

      {/* Mobile Back Button */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          onClick={onBack}
          className="w-full"
          size="lg"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <Card className="card-float">
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="font-medium">Loading trash...</span>
            </div>
          </CardContent>
        </Card>
      ) : entries.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50 bg-gradient-to-br from-muted/30 to-background">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4">
            <div className="rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 p-6 mb-6">
              <Trash2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Trash is empty</h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center max-w-md leading-relaxed">
              Deleted entries will appear here. You can restore them or permanently delete them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <Card
              key={entry.id}
              className={`group card-float bg-card border-border/50 overflow-hidden stagger-fade-in stagger-${Math.min(index + 2, 8)}`}
            >
              <div className="h-1 w-full bg-gradient-to-r from-destructive/50 via-destructive/30 to-destructive/10" />

              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-3">
                    <CardTitle className="text-xl font-bold truncate flex items-center gap-3 text-muted-foreground">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10">
                        <FileText className="h-5 w-5 flex-shrink-0" />
                      </div>
                      <span className="tracking-tight line-through">{entry.data.title || entry.slug}</span>
                    </CardTitle>
                    <CardDescription className="flex flex-wrap gap-3 items-center">
                      <Badge variant="secondary" className="font-mono text-xs bg-muted/50 text-muted-foreground border border-border/50 px-3 py-1">
                        /{entry.slug}
                      </Badge>
                      <Badge variant="destructive" className="text-xs px-3 py-1">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Deleted {formatDate(entry.deletedAt)}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardFooter className="flex flex-wrap gap-3 pt-4 border-t border-border/30">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all duration-200"
                  onClick={() => handleRestoreClick(entry)}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-2" />
                  <span className="font-semibold">Restore</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="shadow-md hover:shadow-lg transition-all duration-200"
                  onClick={() => handleDeleteClick(entry)}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                  <span className="font-semibold">Delete Permanently</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Restore Entry</DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-2">
              Are you sure you want to restore "<span className="font-semibold text-foreground">{selectedEntry?.data.title || selectedEntry?.slug}</span>"?
              This will make it visible again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
              disabled={processing}
              className="hover-lift"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestoreConfirm}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <RotateCcw className="h-4 w-4 mr-2" />
              <span className="font-semibold">Restore</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Permanent Delete
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-2">
              Are you sure you want to <span className="font-semibold text-destructive">permanently delete</span> "<span className="font-semibold text-foreground">{selectedEntry?.data.title || selectedEntry?.slug}</span>"?
              <br /><br />
              <span className="text-destructive font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={processing}
              className="hover-lift"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={processing}
              className="shadow-md hover:shadow-lg transition-all duration-200"
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="font-semibold">Delete Forever</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
