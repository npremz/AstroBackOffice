import { Plus, FolderOpen, Edit, Eye, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    <div className="space-y-6">
      {/* Header - Mobile First */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2>Collections</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your content types and schemas
          </p>
        </div>
        <Button onClick={onCreateCollection} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Collection
        </Button>
      </div>

      {/* Empty State */}
      {collections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2">No collections yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
              Get started by creating your first collection to organize your content
            </p>
            <Button onClick={onCreateCollection}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first collection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Collections Grid - Mobile First */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className="group hover:shadow-xl hover:border-blue-400 transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500"
                onClick={() => onSelectCollection(collection)}
              >
                <CardHeader className="pb-3 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg capitalize truncate flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                          <Layers className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                        </div>
                        {collection.slug}
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        <Badge variant="secondary" className="font-normal bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {collection.schema.length} {collection.schema.length === 1 ? 'field' : 'fields'}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pb-3">
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-muted-foreground">Fields:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {collection.schema.slice(0, 4).map((field, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300">
                          {field.label}
                        </Badge>
                      ))}
                      {collection.schema.length > 4 && (
                        <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300">
                          +{collection.schema.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-2 pt-3 border-t bg-muted/30">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => onSelectCollection(collection)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    View Entries
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCollection(collection);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Stats Summary - Optional */}
          <div className="rounded-lg border bg-card text-card-foreground p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Total Collections:</span>
                <span className="font-semibold">{collections.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Total Fields:</span>
                <span className="font-semibold">
                  {collections.reduce((sum, col) => sum + col.schema.length, 0)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
