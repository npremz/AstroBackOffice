import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface PreviewData {
  collection: string;
  slug: string;
  data: Record<string, any>;
  template: string;
}

export default function PreviewRenderer() {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Load preview data from sessionStorage
    const dataRaw = sessionStorage.getItem('preview-data');

    if (!dataRaw) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      const data = JSON.parse(dataRaw);
      setPreviewData(data);
      setLoading(false);
    } catch (err) {
      console.error('Error parsing preview data:', err);
      setError(true);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <div className="text-center py-16">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-red-900 mb-2">No Preview Data</h2>
          <p className="text-red-700">
            Please open this preview from the admin editor.
          </p>
          <Button
            onClick={() => window.close()}
            className="mt-4"
            variant="destructive"
          >
            Close Window
          </Button>
        </div>
      </div>
    );
  }

  const renderFieldValue = (key: string, value: any) => {
    if (!value) return null;

    // Image
    if (typeof value === 'string' && (value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || value.startsWith('/uploads/'))) {
      return (
        <div key={key} className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </h3>
          <img
            src={value}
            alt={key}
            className="rounded-lg max-w-full h-auto shadow-md"
          />
        </div>
      );
    }

    // Rich text (HTML)
    if (typeof value === 'string' && value.includes('<')) {
      return (
        <div key={key} className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </h3>
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        </div>
      );
    }

    // URL/Link
    if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('/'))) {
      return (
        <div key={key} className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </h3>
          <a
            href={value}
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {value}
          </a>
        </div>
      );
    }

    // Plain text or number
    if (typeof value === 'string' || typeof value === 'number') {
      return (
        <div key={key} className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}
          </h3>
          <p className="text-foreground text-lg">{value}</p>
        </div>
      );
    }

    // Object/Array
    return (
      <div key={key} className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground capitalize">
          {key.replace(/([A-Z])/g, ' $1').trim()}
        </h3>
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
          <code>{JSON.stringify(value, null, 2)}</code>
        </pre>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Title Section */}
      {previewData.data.title && (
        <div className="border-b border-border pb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {previewData.data.title}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span className="font-medium">Collection: {previewData.collection}</span>
            <span>•</span>
            <span className="font-mono">{previewData.slug}</span>
            <span>•</span>
            <span className="font-medium">Template: {previewData.template}</span>
          </div>
        </div>
      )}

      {/* Content Fields */}
      <div className="space-y-8">
        {Object.entries(previewData.data).map(([key, value]) => {
          if (key === 'title') return null; // Already rendered
          return renderFieldValue(key, value);
        })}
      </div>
    </div>
  );
}
