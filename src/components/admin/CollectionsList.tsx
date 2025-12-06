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

interface Props {
  collections: Collection[];
  onSelectCollection: (collection: Collection) => void;
  onCreateCollection: () => void;
  onEditCollection: (collection: Collection) => void;
}

export default function CollectionsList({
  collections,
  onSelectCollection,
  onCreateCollection,
  onEditCollection
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Collections</h2>
        <button
          onClick={onCreateCollection}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Collection
        </button>
      </div>

      {collections.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">No collections yet</p>
          <button
            onClick={onCreateCollection}
            className="text-blue-600 hover:text-blue-800"
          >
            Create your first collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div
                onClick={() => onSelectCollection(collection)}
                className="cursor-pointer mb-3"
              >
                <h3 className="text-lg font-semibold text-gray-900 capitalize mb-2">
                  {collection.slug}
                </h3>
                <p className="text-sm text-gray-500">
                  {collection.schema.length} fields
                </p>
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => onSelectCollection(collection)}
                  className="flex-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  View Entries
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCollection(collection);
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
