import { Plus, Package, Edit, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface Props {
  modules: ContentModule[];
  onSelectModule: (module: ContentModule) => void;
  onCreateModule: () => void;
  onEditModuleSchema: (module: ContentModule) => void;
}

export default function ContentModulesList({
  modules,
  onSelectModule,
  onCreateModule,
  onEditModuleSchema
}: Props) {
  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between stagger-fade-in stagger-1">
        <div className="space-y-2">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Content Modules
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-medium tracking-wide max-w-2xl">
            Manage single-use content for fixed pages like About, Hero, and Contact sections
          </p>
        </div>
        <Button
          onClick={onCreateModule}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="font-semibold">New Module</span>
        </Button>
      </div>

      {/* Empty State */}
      {modules.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50 bg-gradient-to-br from-muted/30 to-background stagger-fade-in stagger-2">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4">
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-6 mb-6">
              <Package className="h-12 w-12 text-primary" />
            </div>
            <h3 className="font-serif text-2xl font-semibold mb-2">No modules yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center mb-8 max-w-md leading-relaxed">
              Create your first content module to manage content for fixed pages like About Us, Hero sections, or Contact information
            </p>
            <Button
              onClick={onCreateModule}
              size="lg"
              className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="font-semibold">Create your first module</span>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Modules Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module, index) => (
              <Card
                key={module.id}
                className={`group card-float bg-card border-border/50 overflow-hidden cursor-pointer stagger-fade-in stagger-${Math.min(index + 2, 8)}`}
                onClick={() => onSelectModule(module)}
              >
                {/* Accent border */}
                <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/50" />

                <CardHeader className="pb-4 bg-gradient-to-br from-muted/20 to-transparent">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-3">
                      <CardTitle className="font-serif text-xl sm:text-2xl truncate flex items-center gap-3 group-hover:text-primary transition-colors duration-200">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                          <Package className="h-5 w-5 flex-shrink-0 text-primary" />
                        </div>
                        <span className="tracking-tight">{module.name}</span>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1"
                        >
                          {module.slug}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pb-4 space-y-3">
                  <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground/70">
                    Schema Fields
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {module.schema.slice(0, 3).map((field, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs font-medium border-border/50 hover:border-accent/50 hover:bg-accent/5 transition-all duration-200"
                      >
                        {field.label}
                      </Badge>
                    ))}
                    {module.schema.length > 3 && (
                      <Badge
                        variant="outline"
                        className="text-xs font-medium border-border/50 bg-muted/50"
                      >
                        +{module.schema.length - 3} more
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {module.schema.length} {module.schema.length === 1 ? 'field' : 'fields'}
                  </p>
                </CardContent>

                <CardFooter className="flex gap-3 pt-4 border-t border-border/30 bg-gradient-to-br from-muted/10 to-transparent">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200"
                    onClick={() => onSelectModule(module)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-2" />
                    <span className="font-semibold">Edit Content</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/50 hover:bg-accent/10 hover:border-accent/50 transition-all duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditModuleSchema(module);
                    }}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span className="sr-only">Schema</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Stats Summary */}
          <div className={`rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-6 sm:p-8 card-float stagger-fade-in stagger-${Math.min(modules.length + 2, 8)}`}>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-gradient-to-r from-primary to-primary/50" />
              <span className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
                Total Modules
              </span>
              <p className="font-numbers text-3xl sm:text-4xl text-foreground ml-auto">
                {modules.length}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
