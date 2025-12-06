import { useState, useEffect, useCallback } from 'react';
import { Menu, Home, Database, ChevronLeft, Package, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import CollectionsList from './CollectionsList';
import CollectionEditor from './CollectionEditor';
import EntriesList from './EntriesList';
import EntryEditor from './EntryEditor';
import ContentModulesList from './ContentModulesList';
import ContentModuleEditor from './ContentModuleEditor';
import ContentModuleContentEditor from './ContentModuleContentEditor';

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

interface ContentModule {
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

type ViewType = 'collections' | 'collection-editor' | 'entries' | 'entry-editor' | 'modules' | 'module-schema-editor' | 'module-content-editor';
type Section = 'collections' | 'modules';

export default function AdminDashboard() {
  // Collections states
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  // Content Modules states
  const [modules, setModules] = useState<ContentModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<ContentModule | null>(null);
  const [editingModuleSchema, setEditingModuleSchema] = useState<ContentModule | null>(null);

  // UI states
  const [view, setView] = useState<ViewType>('collections');
  const [activeSection, setActiveSection] = useState<Section>('collections');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchCollections = async () => {
    const response = await fetch('/api/collections');
    const data = await response.json();
    setCollections(data);
  };

  const fetchModules = async () => {
    const response = await fetch('/api/content-modules');
    const data = await response.json();
    setModules(data);
  };

  // Load state from URL parameters - memoized with useCallback
  const loadStateFromURL = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get('view') as ViewType;
    const section = params.get('section') as Section;
    const collectionId = params.get('collection');
    const entryId = params.get('entry');
    const moduleId = params.get('module');

    // Determine section and view
    if (section) {
      setActiveSection(section);
    } else if (urlView) {
      // Infer section from view
      if (urlView.includes('module')) {
        setActiveSection('modules');
      } else {
        setActiveSection('collections');
      }
    }

    if (urlView) {
      setView(urlView);
    } else {
      // Default views based on section
      if (section === 'modules') {
        setView('modules');
      } else {
        setView('collections');
      }
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

    // Load module if needed
    if (moduleId && modules.length > 0) {
      const module = modules.find(m => m.id === parseInt(moduleId));
      if (module) {
        if (urlView === 'module-schema-editor') {
          setEditingModuleSchema(module);
        } else if (urlView === 'module-content-editor') {
          setSelectedModule(module);
        }
      }
    } else if (!moduleId) {
      // Clear module state if no moduleId in URL
      setSelectedModule(null);
      setEditingModuleSchema(null);
    }
  }, [collections, modules]);

  // Initialize from URL on mount
  useEffect(() => {
    fetchCollections();
    fetchModules();
  }, []);

  // Load state from URL when collections or modules change
  useEffect(() => {
    if (collections.length > 0 || modules.length > 0) {
      loadStateFromURL();
    }
  }, [collections, modules, loadStateFromURL]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      loadStateFromURL();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadStateFromURL]);

  // Update URL without page reload
  const updateURL = (newView: ViewType, section?: Section, collectionId?: number, entryId?: number, moduleId?: number) => {
    const params = new URLSearchParams();

    // Set section
    const currentSection = section || activeSection;
    if (currentSection !== 'collections') {
      params.set('section', currentSection);
    }

    // Set view for non-default views
    const defaultViews: Record<Section, ViewType> = {
      collections: 'collections',
      modules: 'modules'
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

    if (moduleId) {
      params.set('module', moduleId.toString());
    }

    const url = params.toString() ? `/admin?${params.toString()}` : '/admin';
    window.history.pushState({}, '', url);
  };

  // Collections handlers
  const handleSelectCollection = (collection: Collection) => {
    setSelectedCollection(collection);
    setView('entries');
    setMobileMenuOpen(false);
    updateURL('entries', 'collections', collection.id);
  };

  const handleCreateCollection = () => {
    setEditingCollection(null);
    setView('collection-editor');
    setMobileMenuOpen(false);
    updateURL('collection-editor', 'collections');
  };

  const handleEditCollection = (collection: Collection) => {
    setEditingCollection(collection);
    setView('collection-editor');
    setMobileMenuOpen(false);
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

  // Content Modules handlers
  const handleSelectModule = (module: ContentModule) => {
    setSelectedModule(module);
    setView('module-content-editor');
    setMobileMenuOpen(false);
    updateURL('module-content-editor', 'modules', undefined, undefined, module.id);
  };

  const handleCreateModule = () => {
    setEditingModuleSchema(null);
    setView('module-schema-editor');
    setMobileMenuOpen(false);
    updateURL('module-schema-editor', 'modules');
  };

  const handleEditModuleSchema = (module: ContentModule) => {
    setEditingModuleSchema(module);
    setView('module-schema-editor');
    setMobileMenuOpen(false);
    updateURL('module-schema-editor', 'modules', undefined, undefined, module.id);
  };

  const handleModuleSchemaSaveSuccess = () => {
    fetchModules();
    setView('modules');
    setEditingModuleSchema(null);
    updateURL('modules', 'modules');
  };

  const handleModuleContentSaveSuccess = () => {
    fetchModules();
    setView('modules');
    setSelectedModule(null);
    updateURL('modules', 'modules');
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
    } else if (view === 'collection-editor') {
      setView('collections');
      setEditingCollection(null);
      updateURL('collections', 'collections');
    } else if (view === 'module-content-editor' || view === 'module-schema-editor') {
      setView('modules');
      setSelectedModule(null);
      setEditingModuleSchema(null);
      updateURL('modules', 'modules');
    }
  };

  // Section switcher
  const handleSectionChange = (section: Section) => {
    setActiveSection(section);
    if (section === 'collections') {
      setView('collections');
      updateURL('collections', 'collections');
    } else if (section === 'modules') {
      setView('modules');
      updateURL('modules', 'modules');
    }
  };

  const getBreadcrumbs = () => {
    const breadcrumbs = [activeSection === 'collections' ? 'Collections' : 'Content Modules'];

    // Collections breadcrumbs
    if (view === 'collection-editor') {
      breadcrumbs.push(editingCollection ? 'Edit Collection' : 'New Collection');
    } else if (view === 'entries' && selectedCollection) {
      breadcrumbs.push(selectedCollection.slug);
    } else if (view === 'entry-editor' && selectedCollection) {
      breadcrumbs.push(selectedCollection.slug);
      breadcrumbs.push(selectedEntry ? 'Edit Entry' : 'New Entry');
    }

    // Modules breadcrumbs
    if (view === 'module-schema-editor') {
      breadcrumbs.push(editingModuleSchema ? 'Edit Schema' : 'New Module');
    } else if (view === 'module-content-editor' && selectedModule) {
      breadcrumbs.push(selectedModule.name);
    }

    return breadcrumbs;
  };

  return (
    <div className="min-h-screen bg-background grain-overlay">
      {/* Editorial Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {(view !== 'collections' && view !== 'modules') && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="md:hidden hover-lift flex-shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="min-w-0">
                <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground truncate">
                  Editorial CMS
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium tracking-wide hidden sm:block">
                  Content Management System
                </p>
              </div>
            </div>

            {/* Section Tabs */}
            <div className="hidden lg:flex items-center gap-1 bg-muted/30 rounded-lg p-1">
              <Button
                variant={activeSection === 'collections' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleSectionChange('collections')}
                className={activeSection === 'collections' ? 'bg-primary text-primary-foreground' : ''}
              >
                <Layers className="h-4 w-4 mr-2" />
                <span className="font-medium">Collections</span>
              </Button>
              <Button
                variant={activeSection === 'modules' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleSectionChange('modules')}
                className={activeSection === 'modules' ? 'bg-primary text-primary-foreground' : ''}
              >
                <Package className="h-4 w-4 mr-2" />
                <span className="font-medium">Modules</span>
              </Button>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 flex-shrink-0">
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
            <nav className="w-full max-w-7xl mx-auto px-4 py-3 space-y-2">
              {/* Mobile Section Switcher */}
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 mb-2">
                <Button
                  variant={activeSection === 'collections' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSectionChange('collections')}
                  className={`flex-1 ${activeSection === 'collections' ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  <span className="font-medium">Collections</span>
                </Button>
                <Button
                  variant={activeSection === 'modules' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSectionChange('modules')}
                  className={`flex-1 ${activeSection === 'modules' ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  <Package className="h-4 w-4 mr-2" />
                  <span className="font-medium">Modules</span>
                </Button>
              </div>

              {/* Navigation Links */}
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
                // Collections breadcrumbs
                if (index === 0 && activeSection === 'collections' && view !== 'collections') {
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

                // Modules breadcrumbs
                else if (index === 0 && activeSection === 'modules' && view !== 'modules') {
                  // Click on "Content Modules" - go back to modules view
                  if (view === 'module-schema-editor' || view === 'module-content-editor') {
                    setView('modules');
                    setSelectedModule(null);
                    setEditingModuleSchema(null);
                    updateURL('modules');
                  }
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

        {/* Content Modules Section */}
        {view === 'modules' && (
          <ContentModulesList
            modules={modules}
            onSelectModule={handleSelectModule}
            onCreateModule={handleCreateModule}
            onEditModuleSchema={handleEditModuleSchema}
          />
        )}

        {view === 'module-schema-editor' && (
          <ContentModuleEditor
            module={editingModuleSchema}
            onBack={handleBack}
            onSaveSuccess={handleModuleSchemaSaveSuccess}
          />
        )}

        {view === 'module-content-editor' && selectedModule && (
          <ContentModuleContentEditor
            module={selectedModule}
            onBack={handleBack}
            onSaveSuccess={handleModuleContentSaveSuccess}
          />
        )}
      </main>

      {/* Toast notifications */}
      <Toaster position="top-right" expand={true} richColors />
    </div>
  );
}
