import { useState, useEffect } from 'react';

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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    await fetch(`/api/entries/${id}`, { method: 'DELETE' });
    fetchEntries();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900 capitalize">
            {collection.slug}
          </h2>
        </div>
        <button
          onClick={onCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Entry
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">No entries yet</p>
          <button
            onClick={onCreate}
            className="text-blue-600 hover:text-blue-800"
          >
            Create your first entry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between hover:shadow-sm transition-shadow"
            >
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {entry.data.title || entry.slug}
                </h3>
                <p className="text-sm text-gray-500">{entry.slug}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(entry)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
