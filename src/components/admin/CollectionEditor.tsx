import { useState, useEffect } from 'react';

interface FieldSchema {
  label: string;
  type: string;
  key: string;
  required: boolean;
}

interface Collection {
  id?: number;
  slug: string;
  schema: FieldSchema[];
}

interface Props {
  collection: Collection | null;
  onBack: () => void;
  onSaveSuccess: () => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'richtext', label: 'Rich Text (HTML)' },
  { value: 'image', label: 'Image URL' },
];

export default function CollectionEditor({ collection, onBack, onSaveSuccess }: Props) {
  const [slug, setSlug] = useState('');
  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (collection) {
      setSlug(collection.slug);
      setFields(collection.schema);
    } else {
      setSlug('');
      setFields([]);
    }
  }, [collection]);

  const handleAddField = () => {
    setFields([...fields, {
      label: '',
      type: 'text',
      key: '',
      required: false
    }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: Partial<FieldSchema>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...field };

    // Auto-generate key from label
    if (field.label !== undefined) {
      const key = field.label.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
      newFields[index].key = key;
    }

    setFields(newFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    // Validation
    if (!slug) {
      setError('Collection slug is required');
      setSaving(false);
      return;
    }

    if (fields.length === 0) {
      setError('At least one field is required');
      setSaving(false);
      return;
    }

    for (const field of fields) {
      if (!field.label || !field.key) {
        setError('All fields must have a label');
        setSaving(false);
        return;
      }
    }

    try {
      const payload = { slug, schema: fields };

      const response = collection
        ? await fetch(`/api/collections/${collection.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        : await fetch('/api/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

      if (!response.ok) throw new Error('Failed to save');

      onSaveSuccess();
    } catch (err) {
      setError('Failed to save collection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <h2 className="text-xl font-semibold text-gray-900">
          {collection ? 'Edit Collection' : 'New Collection'}
        </h2>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Collection Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collection Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g., products, blog-posts"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier for this collection (lowercase, hyphens allowed)
            </p>
          </div>

          {/* Schema Builder */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Schema Fields</h3>
              <button
                type="button"
                onClick={handleAddField}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                + Add Field
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-500 mb-3">No fields yet</p>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Add your first field
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Field Label <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleFieldChange(index, { label: e.target.value })}
                          placeholder="e.g., Product Name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Field Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => handleFieldChange(index, { type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          {FIELD_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Field Key (auto-generated)
                        </label>
                        <input
                          type="text"
                          value={field.key}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                        />
                      </div>

                      <div className="flex items-end gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => handleFieldChange(index, { required: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Required</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveField(index)}
                          className="ml-auto px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : collection ? 'Update Collection' : 'Create Collection'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
