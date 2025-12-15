import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, ChevronLeft, Loader2, FileText, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface SingleType {
  id: number;
  slug: string;
  name: string;
  schema: any[];
  data: Record<string, any>;
  deletedAt: Date;
}

type TrashItem = 
  | { type: 'entry'; item: Entry }
  | { type: 'single'; item: SingleType };

interface Props {
  onBack: () => void;
}

export default function TrashList({ onBack }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [singles, setSingles] = useState<SingleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TrashItem | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('entries');

  useEffect(() => {
    fetchTrash();
  }, []);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const [entriesRes, singlesRes] = await Promise.all([
        fetch('/api/entries/trash'),
        fetch('/api/content-modules/trash')
      ]);
      const entriesResult = await entriesRes.json();
      const singlesResult = await singlesRes.json();
      setEntries(entriesResult.data || []);
      setSingles(singlesResult.data || []);
    } catch (error) {
      toast.error('Failed to load trash');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = (item: TrashItem) => {
    setSelectedItem(item);
    setRestoreDialogOpen(true);
  };

  const handleDeleteClick = (item: TrashItem) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!selectedItem) return;

    setProcessing(true);
    try {
      if (selectedItem.type === 'entry') {
        await apiPost(`/api/entries/${selectedItem.item.id}/restore`, {});
        toast.success('Entry restored!', {
          description: `"${selectedItem.item.data.title || selectedItem.item.slug}" has been restored.`,
        });
      } else {
        await apiPost(`/api/content-modules/${selectedItem.item.id}/restore`, {});
        toast.success('Single type restored!', {
          description: `"${selectedItem.item.name}" has been restored.`,
        });
      }

      fetchTrash();
    } catch (err) {
      toast.error(`Failed to restore ${selectedItem.type === 'entry' ? 'entry' : 'single type'}`);
    } finally {
      setProcessing(false);
      setRestoreDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedItem) return;

    setProcessing(true);
    try {
      if (selectedItem.type === 'entry') {
        await apiDelete(`/api/entries/${selectedItem.item.id}?permanent=true`);
        toast.success('Entry permanently deleted', {
          description: `"${selectedItem.item.data.title || selectedItem.item.slug}" has been permanently removed.`,
        });
      } else {
        await apiDelete(`/api/content-modules/${selectedItem.item.id}/permanent`);
        toast.success('Single type permanently deleted', {
          description: `"${selectedItem.item.name}" has been permanently removed.`,
        });
      }

      fetchTrash();
    } catch (err) {
      toast.error(`Failed to delete ${selectedItem.type === 'entry' ? 'entry' : 'single type'}`);
    } finally {
      setProcessing(false);
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const getItemTitle = (item: TrashItem): string => {
    if (item.type === 'entry') {
      return item.item.data.title || item.item.slug;
    }
    return item.item.name;
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
            Deleted items can be restored or permanently removed
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
      ) : entries.length === 0 && singles.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50 bg-gradient-to-br from-muted/30 to-background">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4">
            <div className="rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 p-6 mb-6">
              <Trash2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Trash is empty</h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center max-w-md leading-relaxed">
              Deleted items will appear here. You can restore them or permanently delete them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="entries" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Entries ({entries.length})
            </TabsTrigger>
            <TabsTrigger value="singles" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Singles ({singles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="space-y-4">
            {entries.length === 0 ? (
              <Card className="border-dashed border-2 border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No deleted entries</p>
                </CardContent>
              </Card>
            ) : (
              entries.map((entry, index) => (
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
                      onClick={() => handleRestoreClick({ type: 'entry', item: entry })}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-2" />
                      <span className="font-semibold">Restore</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="shadow-md hover:shadow-lg transition-all duration-200"
                      onClick={() => handleDeleteClick({ type: 'entry', item: entry })}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                      <span className="font-semibold">Delete Permanently</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="singles" className="space-y-4">
            {singles.length === 0 ? (
              <Card className="border-dashed border-2 border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No deleted single types</p>
                </CardContent>
              </Card>
            ) : (
              singles.map((single, index) => (
                <Card
                  key={single.id}
                  className={`group card-float bg-card border-border/50 overflow-hidden stagger-fade-in stagger-${Math.min(index + 2, 8)}`}
                >
                  <div className="h-1 w-full bg-gradient-to-r from-destructive/50 via-destructive/30 to-destructive/10" />

                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-3">
                        <CardTitle className="text-xl font-bold truncate flex items-center gap-3 text-muted-foreground">
                          <div className="p-2 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10">
                            <Package className="h-5 w-5 flex-shrink-0" />
                          </div>
                          <span className="tracking-tight line-through">{single.name}</span>
                        </CardTitle>
                        <CardDescription className="flex flex-wrap gap-3 items-center">
                          <Badge variant="secondary" className="font-mono text-xs bg-muted/50 text-muted-foreground border border-border/50 px-3 py-1">
                            /{single.slug}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-3 py-1">
                            {single.schema?.length || 0} fields
                          </Badge>
                          <Badge variant="destructive" className="text-xs px-3 py-1">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Deleted {formatDate(single.deletedAt)}
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
                      onClick={() => handleRestoreClick({ type: 'single', item: single })}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-2" />
                      <span className="font-semibold">Restore</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="shadow-md hover:shadow-lg transition-all duration-200"
                      onClick={() => handleDeleteClick({ type: 'single', item: single })}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                      <span className="font-semibold">Delete Permanently</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Restore {selectedItem?.type === 'single' ? 'Single Type' : 'Entry'}</DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-2">
              Are you sure you want to restore "<span className="font-semibold text-foreground">{selectedItem ? getItemTitle(selectedItem) : ''}</span>"?
              {selectedItem?.type === 'single' 
                ? ' This single type will be available again in the dashboard.'
                : ' This entry will be visible again in its collection.'}
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
              Delete {selectedItem?.type === 'single' ? 'Single Type' : 'Entry'} Permanently
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-2">
              Are you sure you want to <span className="font-semibold text-destructive">permanently delete</span> the {selectedItem?.type === 'single' ? 'single type' : 'entry'} "<span className="font-semibold text-foreground">{selectedItem ? getItemTitle(selectedItem) : ''}</span>"?
              {selectedItem?.type === 'single' && (
                <><br /><br /><span className="text-muted-foreground">All data associated with this single type will be lost.</span></>
              )}
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
