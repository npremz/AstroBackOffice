import { Layers, Package, FileText, Mail, Sparkles, ArrowRight, Settings, Database, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Collection {
  id: number;
  slug: string;
  schema: any[];
}

interface SingleType {
  id: number;
  slug: string;
  name: string;
  schema: any[];
}

interface Props {
  collections: Collection[];
  singleTypes: SingleType[];
  onNavigateToCollections: () => void;
  onNavigateToSingleTypes: () => void;
  onNavigateToTrash?: () => void;
}

export default function Dashboard({
  collections,
  singleTypes,
  onNavigateToCollections,
  onNavigateToSingleTypes,
  onNavigateToTrash
}: Props) {
  // Calculate total fields across all collections and single types
  const totalCollectionFields = collections.reduce((sum, col) => sum + col.schema.length, 0);
  const totalSingleFields = singleTypes.reduce((sum, single) => sum + single.schema.length, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8 stagger-fade-in stagger-1">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
          Editorial CMS
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground font-medium tracking-wide max-w-2xl mx-auto">
          Gérez votre contenu avec élégance et simplicité
        </p>
        <Badge variant="secondary" className="font-medium text-sm px-4 py-1.5">
          Powered by Horde Agence
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-fade-in stagger-2">
        <Card className="card-float bg-gradient-to-br from-primary/5 to-background border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Collections</CardTitle>
              <Layers className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-numbers text-foreground">{collections.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCollectionFields} champs au total
            </p>
          </CardContent>
        </Card>

        <Card className="card-float bg-gradient-to-br from-accent/5 to-background border-accent/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Single Types</CardTitle>
              <Package className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-numbers text-foreground">{singleTypes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalSingleFields} champs au total
            </p>
          </CardContent>
        </Card>

        <Card className="card-float bg-gradient-to-br from-primary/5 to-background border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Types</CardTitle>
              <Database className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-numbers text-foreground">
              {collections.length + singleTypes.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Types de contenu configurés
            </p>
          </CardContent>
        </Card>

        <Card className="card-float bg-gradient-to-br from-accent/5 to-background border-accent/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Champs</CardTitle>
              <FileText className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-numbers text-foreground">
              {totalCollectionFields + totalSingleFields}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Champs disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-fade-in stagger-3">
        {/* Collections Card */}
        <Card className="card-float border-border/50 overflow-hidden group cursor-pointer" onClick={onNavigateToCollections}>
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/50" />
          <CardHeader className="bg-gradient-to-br from-muted/20 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold group-hover:text-primary transition-colors duration-200">
                  Collection Types
                </CardTitle>
                <CardDescription className="mt-1">
                  Contenus répétables comme articles, projets, produits
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">{collections.length} collections configurées</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
                Voir tout
              </Badge>
            </div>
            {collections.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Collections récentes
                </p>
                <div className="flex flex-wrap gap-2">
                  {collections.slice(0, 5).map((col) => (
                    <Badge key={col.id} variant="outline" className="text-xs capitalize">
                      {col.slug}
                    </Badge>
                  ))}
                  {collections.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{collections.length - 5} plus
                    </Badge>
                  )}
                </div>
              </div>
            )}
             <Button
               className="w-full bg-primary hover:bg-primary/90 group-hover:shadow-lg transition-all duration-300"
               onClick={(event) => {
                 event.stopPropagation();
                 onNavigateToCollections();
               }}
             >
               <span className="font-semibold">Gérer les Collections</span>
               <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
             </Button>
           </CardContent>
        </Card>

        {/* Single Types Card */}
        <Card className="card-float border-border/50 overflow-hidden group cursor-pointer" onClick={onNavigateToSingleTypes}>
          <div className="h-1 w-full bg-gradient-to-r from-accent via-primary to-accent/50" />
          <CardHeader className="bg-gradient-to-br from-muted/20 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-accent/10 to-primary/10 group-hover:from-accent/20 group-hover:to-primary/20 transition-all duration-300">
                <Package className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold group-hover:text-accent transition-colors duration-200">
                  Single Types
                </CardTitle>
                <CardDescription className="mt-1">
                  Contenus uniques comme About, Hero, Contact
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">{singleTypes.length} single types configurés</span>
              <Badge variant="secondary" className="bg-accent/10 text-accent border border-accent/20">
                Voir tout
              </Badge>
            </div>
            {singleTypes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Single types récents
                </p>
                <div className="flex flex-wrap gap-2">
                  {singleTypes.slice(0, 5).map((single) => (
                    <Badge key={single.id} variant="outline" className="text-xs">
                      {single.name}
                    </Badge>
                  ))}
                  {singleTypes.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{singleTypes.length - 5} plus
                    </Badge>
                  )}
                </div>
              </div>
            )}
             <Button
               className="w-full bg-accent hover:bg-accent/90 group-hover:shadow-lg transition-all duration-300"
               onClick={(event) => {
                 event.stopPropagation();
                 onNavigateToSingleTypes();
               }}
             >
               <span className="font-semibold">Gérer les Single Types</span>
               <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
             </Button>
           </CardContent>
        </Card>
      </div>

      {/* Trash Card */}
      {onNavigateToTrash && (
        <div className="stagger-fade-in stagger-4">
          <Card className="card-float border-border/50 overflow-hidden group cursor-pointer hover:border-destructive/30" onClick={onNavigateToTrash}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-destructive/10 to-red-500/10 group-hover:from-destructive/20 group-hover:to-red-500/20 transition-all duration-300">
                    <Trash2 className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-destructive transition-colors duration-200">
                      Corbeille
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Gérez les éléments supprimés
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-destructive group-hover:translate-x-1 transition-all duration-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Support Section */}
      <Card className="card-float border-border/50 overflow-hidden stagger-fade-in stagger-4">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary/50" />
        <CardContent className="p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 mb-2">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">
              Besoin d'aide ou avez des suggestions ?
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Notre équipe est là pour vous accompagner. N'hésitez pas à nous contacter pour toute question, problème technique ou suggestion d'amélioration.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="border-primary/20 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
              asChild
            >
              <a href="mailto:support@hordeagence.com" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="font-semibold">support@hordeagence.com</span>
              </a>
            </Button>
            <Badge variant="secondary" className="text-xs font-medium">
              Réponse sous 24h
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="card-float border-border/50 stagger-fade-in stagger-5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-accent/10 to-primary/10">
              <Settings className="h-5 w-5 text-accent" />
            </div>
            <CardTitle className="text-xl font-bold">Conseils rapides</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground font-semibold">Collections</strong> : Utilisez-les pour du contenu répétable (articles, projets, produits)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground font-semibold">Single Types</strong> : Parfaits pour du contenu unique (page About, Hero, Contact)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground font-semibold">Rich Text</strong> : Utilisez l'éditeur visuel pour formater votre contenu sans HTML
              </span>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <span className="text-muted-foreground">
                <strong className="text-foreground font-semibold">Sidebar</strong> : Navigation rapide entre vos collections et single types
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
