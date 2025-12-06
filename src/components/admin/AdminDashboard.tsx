import { useState, useEffect } from 'react';
import { Menu, Home, Database, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import CollectionsList from './CollectionsList';
import CollectionEditor from './CollectionEditor';
import EntriesList from './EntriesList';
import EntryEditor from './EntryEditor';

interface Collection {
  id: number;
  slug: string;
  schema: Array<{
    label: string;
    type: string;
    key: string;
    required: boolean;
  }>;
}

interface Entry {
  id: number;
  collectionId: number;
  slug: string;
  data: Record<string, any>;
  template: string;
  publishedAt: Date;
}

export default function AdminDashboard() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [view, setView] = useState<'collections' | 'collection-editor' | 'entries' | 'entry-editor'>('collections');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize from URL on mount
  useEffect(() => {
    fetchCollections();

    // Handle browser back/forward buttons
    const handlePopState = () => {
      loadStateFromURL();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load state from URL when collections are loaded
  useEffect(() => {
    if (collections.length > 0) {
      loadStateFromURL();
    }
  }, [collections]);

  const fetchCollections = async () => {
    const response = await fetch('/api/collections');
    const data = await response.json();
    setCollections(data);
  };

  // Load state from URL parameters
  const loadStateFromURL = async () => {
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view') as typeof view || 'collections';
    const collectionId = params.get('collection');
    const entryId = params.get('entry');

    setView(urlView);

    // Load collection if needed
    if (collectionId && collections.length > 0) {
      const collection = collections.find(c => c.id === parseInt(collectionId));
      if (collection) {
        if (urlView === 'collection-editor') {
          setEditingCollection(collection);
        } else {
          setSelectedCollection(collection);
        }

        // Load entry if needed
        if (entryId && urlView === 'entry-editor') {
          const entriesResponse = await fetch(`/api/entries?collectionId=${collectionId}`);
          const entries = await entriesResponse.json();
          const entry = entries.find((e: Entry) => e.id === parseInt(entryId));
          if (entry) {
            setSelectedEntry(entry);
          }
        }
      }
    }
  };

  // Update URL without page reload
  const updateURL = (newView: typeof view, collectionId?: number, entryId?: number) => {
    const params = new URLSearchParams();

    if (newView !== 'collections') {
      params.set('view', newView);
    }

    if (collectionId) {
      params.set('collection', collectionId.toString());
    }

    if (entryId) {
      params.set('entry', entryId.toString());
    }

    const url = params.toString() ? `/admin?${params.toString()}` : '/admin';
    window.history.pushState({}, '', url);
  };

  const handleSelectCollection = (collection: Collection) => {
    setSelectedCollection(collection);
    setView('entries');
    setMobileMenuOpen(false);
    updateURL('entries', collection.id);
  };

  const handleCreateCollection = () => {
    setEditingCollection(null);
    setView('collection-editor');
    setMobileMenuOpen(false);
    updateURL('collection-editor');
  };

  const handleEditCollection = (collection: Collection) => {
    setEditingCollection(collection);
    setView('collection-editor');
    setMobileMenuOpen(false);
    updateURL('collection-editor', collection.id);
  };

  const handleCreateEntry = () => {
    setSelectedEntry(null);
    setView('entry-editor');
    updateURL('entry-editor', selectedCollection?.id);
  };

  const handleEditEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setView('entry-editor');
    updateURL('entry-editor', selectedCollection?.id, entry.id);
  };

  const handleBack = () => {
    if (view === 'entry-editor') {
      setView('entries');
      updateURL('entries', selectedCollection?.id);
    } else if (view === 'entries') {
      setView('collections');
      setSelectedCollection(null);
      updateURL('collections');
    } else if (view === 'collection-editor') {
      setView('collections');
      setEditingCollection(null);
      updateURL('collections');
    }
  };

  const handleCollectionSaveSuccess = () => {
    fetchCollections();
    setView('collections');
    setEditingCollection(null);
    updateURL('collections');
  };

  const handleEntrySaveSuccess = () => {
    setView('entries');
    setSelectedEntry(null);
    updateURL('entries', selectedCollection?.id);
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = ['Collections'];
    if (view === 'collection-editor') {
      breadcrumbs.push(editingCollection ? 'Edit Collection' : 'New Collection');
    } else if (view === 'entries' && selectedCollection) {
      breadcrumbs.push(selectedCollection.slug);
    } else if (view === 'entry-editor' && selectedCollection) {
      breadcrumbs.push(selectedCollection.slug);
      breadcrumbs.push(selectedEntry ? 'Edit Entry' : 'New Entry');
    }
    return breadcrumbs;
  };

  return (
    <div className="min-h-screen bg-background grain-overlay">
      {/* Editorial Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {view !== 'collections' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="md:hidden hover-lift"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  Editorial CMS
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium tracking-wide">
                  Content Management System
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="sm" className="hover-lift" asChild>
                <a href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Home</span>
                </a>
              </Button>
              <Button variant="ghost" size="sm" className="hover-lift" asChild>
                <a href="/db-test" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">Database</span>
                </a>
              </Button>
            </nav>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover-lift"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border/50 md:hidden bg-card/50 backdrop-blur-sm">
            <nav className="w-full max-w-7xl mx-auto px-4 py-3 space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start hover-lift" asChild>
                <a href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Home</span>
                </a>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start hover-lift" asChild>
                <a href="/db-test" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">Database</span>
                </a>
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Editorial Breadcrumbs */}
      <div className="border-b border-border/30 bg-gradient-to-r from-muted/30 to-muted/10">
        <div className="w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 text-sm overflow-x-auto">
            {getBreadcrumbs().map((crumb, index) => {
              const isLast = index === getBreadcrumbs().length - 1;
              const isClickable = !isLast;

              // Determine the action for each breadcrumb
              const handleClick = () => {
                if (index === 0 && view !== 'collections') {
                  // Click on "Collections" - go back to collections view
                  if (view === 'collection-editor') {
                    handleBack();
                  } else if (view === 'entries') {
                    handleBack();
                  } else if (view === 'entry-editor') {
                    // Go back twice to reach collections
                    setView('collections');
                    setSelectedCollection(null);
                    updateURL('collections');
                  }
                } else if (index === 1 && view === 'entry-editor' && selectedCollection) {
                  // Click on collection name from entry-editor - go to entries view
                  setView('entries');
                  updateURL('entries', selectedCollection.id);
                }
              };

              return (
                <div key={index} className="flex items-center gap-2.5 whitespace-nowrap">
                  {index > 0 && (
                    <span className="text-muted-foreground/40 font-light">/</span>
                  )}
                  {isClickable ? (
                    <button
                      onClick={handleClick}
                      className="text-muted-foreground hover:text-primary transition-all duration-200 font-medium tracking-wide hover:underline underline-offset-4 decoration-primary/30"
                    >
                      {crumb}
                    </button>
                  ) : (
                    <span className="text-foreground font-serif font-semibold tracking-tight">
                      {crumb}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content - Editorial Layout */}
      <main className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {view === 'collections' && (
          <CollectionsList
            collections={collections}
            onSelectCollection={handleSelectCollection}
            onCreateCollection={handleCreateCollection}
            onEditCollection={handleEditCollection}
          />
        )}

        {view === 'collection-editor' && (
          <CollectionEditor
            collection={editingCollection}
            onBack={handleBack}
            onSaveSuccess={handleCollectionSaveSuccess}
          />
        )}

        {view === 'entries' && selectedCollection && (
          <EntriesList
            collection={selectedCollection}
            onBack={handleBack}
            onCreate={handleCreateEntry}
            onEdit={handleEditEntry}
          />
        )}

        {view === 'entry-editor' && selectedCollection && (
          <EntryEditor
            collection={selectedCollection}
            entry={selectedEntry}
            onBack={handleBack}
            onSaveSuccess={handleEntrySaveSuccess}
          />
        )}
      </main>

      {/* Toast notifications */}
      <Toaster position="top-right" expand={true} richColors />
    </div>
  );
}
