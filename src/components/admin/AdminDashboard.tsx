import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import Sidebar from './Sidebar';
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs';
import Dashboard from './Dashboard';
import CollectionsList from './CollectionsList';
import CollectionEditor from './CollectionEditor';
import EntriesList from './EntriesList';
import EntryEditor from './EntryEditor';
import SingleTypesList from './SingleTypesList';
import SingleTypeEditor from './SingleTypeEditor';
import SingleTypeContentEditor from './SingleTypeContentEditor';

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
  updatedAt: Date;
}

type ViewType = 'dashboard' | 'collections' | 'collection-editor' | 'entries' | 'entry-editor' | 'single' | 'single-schema-editor' | 'single-content-editor';
type Section = 'collections' | 'single';

export default function AdminDashboard() {
  // Collections states
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  // Single Types states
  const [singleTypes, setSingleTypes] = useState<SingleType[]>([]);
  const [selectedSingle, setSelectedSingle] = useState<SingleType | null>(null);
  const [editingSingleSchema, setEditingSingleSchema] = useState<SingleType | null>(null);

  // UI states
  const [view, setView] = useState<ViewType>('dashboard');
  const [activeSection, setActiveSection] = useState<Section>('collections');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchCollections = async () => {
    const response = await fetch('/api/collections');
    const data = await response.json();
    setCollections(data);
  };

  const fetchSingleTypes = async () => {
    const response = await fetch('/api/content-modules');
    const data = await response.json();
    setSingleTypes(data);
  };

  // Load state from URL parameters - memoized with useCallback
  const loadStateFromURL = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view') as ViewType;
    const section = params.get('section') as Section;
    const collectionId = params.get('collection');
    const entryId = params.get('entry');
    const singleId = params.get('single');

    // Determine section and view
    if (section) {
      setActiveSection(section);
    } else if (urlView) {
      // Infer section from view
      if (urlView.includes('single')) {
        setActiveSection('single');
      } else {
        setActiveSection('collections');
      }
    }

    if (urlView) {
      setView(urlView);
    } else if (section) {
      // Default views based on section
      if (section === 'single') {
        setView('single');
      } else {
        setView('collections');
      }
    } else {
      // No URL params - show dashboard
      setView('dashboard');
    }

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
    } else if (!collectionId) {
      // Clear collection state if no collectionId in URL
      setSelectedCollection(null);
      setEditingCollection(null);
      setSelectedEntry(null);
    }

    // Load single type if needed
    if (singleId && singleTypes.length > 0) {
      const single = singleTypes.find(m => m.id === parseInt(singleId));
      if (single) {
        if (urlView === 'single-schema-editor') {
          setEditingSingleSchema(single);
        } else if (urlView === 'single-content-editor') {
          setSelectedSingle(single);
        }
      }
    } else if (!singleId) {
      // Clear single state if no singleId in URL
      setSelectedSingle(null);
      setEditingSingleSchema(null);
    }
  }, [collections, singleTypes]);

  // Initialize from URL on mount
  useEffect(() => {
    fetchCollections();
    fetchSingleTypes();
  }, []);

  // Load state from URL when collections or single types change
  useEffect(() => {
    if (collections.length > 0 || singleTypes.length > 0) {
      loadStateFromURL();
    }
  }, [collections, singleTypes, loadStateFromURL]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      loadStateFromURL();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadStateFromURL]);

  // Update URL without page reload
  const updateURL = (newView: ViewType, section?: Section, collectionId?: number, entryId?: number, singleId?: number) => {
    // Dashboard has no URL params
    if (newView === 'dashboard') {
      window.history.pushState({}, '', '/admin');
      return;
    }

    const params = new URLSearchParams();

    // Set section
    const currentSection = section || activeSection;
    if (currentSection !== 'collections') {
      params.set('section', currentSection);
    }

    // Set view for non-default views
    const defaultViews: Record<Section, ViewType> = {
      collections: 'collections',
      single: 'single'
    };

    if (newView !== defaultViews[currentSection]) {
      params.set('view', newView);
    }

    if (collectionId) {
      params.set('collection', collectionId.toString());
    }

    if (entryId) {
      params.set('entry', entryId.toString());
    }

    if (singleId) {
      params.set('single', singleId.toString());
    }

    const url = params.toString() ? `/admin?${params.toString()}` : '/admin';
    window.history.pushState({}, '', url);
  };

  // Collections handlers
  const handleSelectCollection = (collection: Collection) => {
    setSelectedCollection(collection);
    setView('entries');
    setActiveSection('collections');
    updateURL('entries', 'collections', collection.id);
  };

  const handleCreateCollection = () => {
    setEditingCollection(null);
    setView('collection-editor');
    setActiveSection('collections');
    updateURL('collection-editor', 'collections');
  };

  const handleEditCollection = (collection: Collection) => {
    setEditingCollection(collection);
    setView('collection-editor');
    setActiveSection('collections');
    updateURL('collection-editor', 'collections', collection.id);
  };

  const handleCreateEntry = () => {
    setSelectedEntry(null);
    setView('entry-editor');
    updateURL('entry-editor', 'collections', selectedCollection?.id);
  };

  const handleEditEntry = (entry: Entry) => {
    setSelectedEntry(entry);
    setView('entry-editor');
    updateURL('entry-editor', 'collections', selectedCollection?.id, entry.id);
  };

  const handleCollectionSaveSuccess = () => {
    fetchCollections();
    setView('collections');
    setEditingCollection(null);
    updateURL('collections', 'collections');
  };

  const handleEntrySaveSuccess = () => {
    setView('entries');
    setSelectedEntry(null);
    updateURL('entries', 'collections', selectedCollection?.id);
  };

  // Single Types handlers
  const handleSelectSingle = (single: SingleType) => {
    setSelectedSingle(single);
    setView('single-content-editor');
    setActiveSection('single');
    updateURL('single-content-editor', 'single', undefined, undefined, single.id);
  };

  const handleCreateSingle = () => {
    setEditingSingleSchema(null);
    setView('single-schema-editor');
    setActiveSection('single');
    updateURL('single-schema-editor', 'single');
  };

  const handleEditSingleSchema = (single: SingleType) => {
    setEditingSingleSchema(single);
    setView('single-schema-editor');
    setActiveSection('single');
    updateURL('single-schema-editor', 'single', undefined, undefined, single.id);
  };

  const handleSingleSchemaSaveSuccess = () => {
    fetchSingleTypes();
    setView('single');
    setEditingSingleSchema(null);
    updateURL('single', 'single');
  };

  const handleSingleContentSaveSuccess = () => {
    fetchSingleTypes();
    setView('single');
    setSelectedSingle(null);
    updateURL('single', 'single');
  };

  // Back navigation handler
  const handleBack = () => {
    if (view === 'entry-editor') {
      setView('entries');
      updateURL('entries', 'collections', selectedCollection?.id);
    } else if (view === 'entries') {
      setView('collections');
      setSelectedCollection(null);
      updateURL('collections', 'collections');
    } else if (view === 'collections') {
      setView('dashboard');
      updateURL('dashboard');
    } else if (view === 'collection-editor') {
      setView('collections');
      setEditingCollection(null);
      updateURL('collections', 'collections');
    } else if (view === 'single') {
      setView('dashboard');
      updateURL('dashboard');
    } else if (view === 'single-content-editor' || view === 'single-schema-editor') {
      setView('single');
      setSelectedSingle(null);
      setEditingSingleSchema(null);
      updateURL('single', 'single');
    }
  };

  // Section switcher
  const handleSectionChange = (section: Section) => {
    setActiveSection(section);
    if (section === 'collections') {
      setView('collections');
      updateURL('collections', 'collections');
    } else if (section === 'single') {
      setView('single');
      updateURL('single', 'single');
    }
  };

  // Dashboard navigation handlers
  const handleNavigateToHome = () => {
    setView('dashboard');
    updateURL('dashboard');
  };

  const handleNavigateToCollections = () => {
    setActiveSection('collections');
    setView('collections');
    updateURL('collections', 'collections');
  };

  const handleNavigateToSingleTypes = () => {
    setActiveSection('single');
    setView('single');
    updateURL('single', 'single');
  };

  const navigateToEntriesList = () => {
    if (!selectedCollection) return;
    setView('entries');
    updateURL('entries', 'collections', selectedCollection.id);
  };

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', onClick: view !== 'dashboard' ? handleNavigateToHome : undefined }
    ];

    if (view === 'dashboard') {
      return breadcrumbs;
    }

    if (activeSection === 'collections') {
      breadcrumbs.push({
        label: 'Collections',
        onClick: view !== 'collections' ? handleNavigateToCollections : undefined
      });
      if (view === 'collection-editor') {
        breadcrumbs.push({
          label: editingCollection ? 'Edit Collection' : 'New Collection'
        });
      } else if (selectedCollection) {
        breadcrumbs.push({
          label: selectedCollection.slug,
          onClick: view !== 'entries' ? navigateToEntriesList : undefined
        });

        if (view === 'entries') {
          breadcrumbs.push({ label: 'Entries' });
        } else if (view === 'entry-editor') {
          breadcrumbs.push({
            label: 'Entries',
            onClick: navigateToEntriesList
          });
          breadcrumbs.push({
            label: selectedEntry ? 'Edit Entry' : 'New Entry'
          });
        }
      }
    } else {
      breadcrumbs.push({
        label: 'Single Types',
        onClick: view !== 'single' ? handleNavigateToSingleTypes : undefined
      });

      if (view === 'single-schema-editor') {
        breadcrumbs.push({
          label: editingSingleSchema ? 'Edit Schema' : 'New Single Type'
        });
      } else if (view === 'single-content-editor' && selectedSingle) {
        breadcrumbs.push({
          label: selectedSingle.name,
          onClick: () => {
            setView('single');
            updateURL('single', 'single');
          }
        });
        breadcrumbs.push({ label: 'Content' });
      }
    }

    return breadcrumbs;
  };

  return (
    <div className="min-h-screen bg-background grain-overlay flex">
      {/* Sidebar */}
      <Sidebar
        collections={collections}
        singleTypes={singleTypes}
        activeSection={activeSection}
        selectedCollectionId={selectedCollection?.id}
        selectedSingleId={selectedSingle?.id}
        onSelectCollection={handleSelectCollection}
        onSelectSingle={handleSelectSingle}
        onCreateCollection={handleCreateCollection}
        onCreateSingle={handleCreateSingle}
        onNavigateToHome={handleNavigateToHome}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden lg:ml-72">
        {/* Top Bar with Breadcrumbs - Fixed */}
        <div className="fixed top-0 right-0 left-0 lg:left-72 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
          <div className="px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Breadcrumbs items={getBreadcrumbs()} />
            </div>
          </div>
        </div>

        {/* Content Area with padding to account for fixed header */}
        <div className="px-4 pb-8 sm:px-6 lg:px-8 lg:pb-12 pt-28 lg:pt-32">
          {/* Dashboard */}
          {view === 'dashboard' && (
            <Dashboard
              collections={collections}
              singleTypes={singleTypes}
              onNavigateToCollections={handleNavigateToCollections}
              onNavigateToSingleTypes={handleNavigateToSingleTypes}
            />
          )}

          {/* Collections Section */}
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
              onEditSchema={handleEditCollection}
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

          {/* Single Types Section */}
          {view === 'single' && (
            <SingleTypesList
              singleTypes={singleTypes}
              onSelectSingle={handleSelectSingle}
              onCreateSingle={handleCreateSingle}
              onEditSingleSchema={handleEditSingleSchema}
            />
          )}

          {view === 'single-schema-editor' && (
            <SingleTypeEditor
              singleType={editingSingleSchema}
              onBack={handleBack}
              onSaveSuccess={handleSingleSchemaSaveSuccess}
            />
          )}

          {view === 'single-content-editor' && selectedSingle && (
            <SingleTypeContentEditor
              singleType={selectedSingle}
              onBack={handleBack}
              onSaveSuccess={handleSingleContentSaveSuccess}
            />
          )}
        </div>
      </main>

      {/* Toast notifications */}
      <Toaster position="top-right" expand={true} richColors />
    </div>
  );
}
