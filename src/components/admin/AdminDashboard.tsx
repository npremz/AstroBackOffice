import { useState, useEffect } from 'react';
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
  };

  const handleCreateCollection = () => {
    setEditingCollection(null);
    setView('collection-editor');
  };

  const handleEditCollection = (collection: Collection) => {
    setEditingCollection(collection);
    setView('collection-editor');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">CMS Admin</h1>
            <a href="/db-test" className="text-sm text-blue-600 hover:text-blue-800">
              Database Test
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    </div>
  );
}
