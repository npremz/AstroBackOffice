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

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    const response = await fetch('/api/collections');
    const data = await response.json();
    setCollections(data);
  };

  const handleSelectCollection = (collection: Collection) => {
    setSelectedCollection(collection);
    setView('entries');
    setMobileMenuOpen(false);
  };

  const handleCreateCollection = () => {
    setEditingCollection(null);
    setView('collection-editor');
    setMobileMenuOpen(false);
  };

  const handleEditCollection = (collection: Collection) => {
    setEditingCollection(collection);
    setView('collection-editor');
    setMobileMenuOpen(false);
  };

  const handleCreateEntry = () => {
    setSelectedEntry(null);
    setView('entry-editor');
  };

  const handleEditEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setView('entry-editor');
  };

  const handleBack = () => {
    if (view === 'entry-editor') {
      setView('entries');
    } else if (view === 'entries') {
      setView('collections');
      setSelectedCollection(null);
    } else if (view === 'collection-editor') {
      setView('collections');
      setEditingCollection(null);
    }
  };

  const handleCollectionSaveSuccess = () => {
    fetchCollections();
    setView('collections');
    setEditingCollection(null);
  };

  const handleEntrySaveSuccess = () => {
    setView('entries');
    setSelectedEntry(null);
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
    <div className="min-h-screen bg-background">
      {/* Mobile-First Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full max-w-7xl mx-auto flex h-14 items-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 flex-1">
            {view !== 'collections' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="md:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-lg font-semibold sm:text-xl truncate">
              CMS Admin
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href="/">
                <Home className="h-4 w-4 mr-2" />
                Home
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="/db-test">
                <Database className="h-4 w-4 mr-2" />
                Database
              </a>
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t md:hidden">
            <nav className="w-full max-w-7xl mx-auto px-4 py-2 space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                <a href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </a>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                <a href="/db-test">
                  <Database className="h-4 w-4 mr-2" />
                  Database
                </a>
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Breadcrumbs - Mobile First */}
      <div className="border-b bg-muted/40">
        <div className="w-full max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto">
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
                  }
                } else if (index === 1 && view === 'entry-editor' && selectedCollection) {
                  // Click on collection name from entry-editor - go to entries view
                  setView('entries');
                }
              };

              return (
                <div key={index} className="flex items-center gap-2 whitespace-nowrap">
                  {index > 0 && <span>/</span>}
                  {isClickable ? (
                    <button
                      onClick={handleClick}
                      className="hover:text-foreground transition-colors cursor-pointer"
                    >
                      {crumb}
                    </button>
                  ) : (
                    <span className="text-foreground font-medium">
                      {crumb}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content - Centered on desktop */}
      <main className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
