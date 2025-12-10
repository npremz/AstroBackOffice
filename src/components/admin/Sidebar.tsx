import { Layers, Package, Plus, ChevronRight, Menu, X, Mail, Home, Image, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

interface Props {
  collections: Collection[];
  singleTypes: SingleType[];
  activeSection: 'collections' | 'single' | 'media' | 'admin';
  selectedCollectionId?: number;
  selectedSingleId?: number;
  onSelectCollection: (collection: Collection) => void;
  onSelectSingle: (single: SingleType) => void;
  onCreateCollection: () => void;
  onCreateSingle: () => void;
  onNavigateToHome: () => void;
  onNavigateToMedia: () => void;
  onNavigateToInvitations?: () => void;
  onNavigateToUsers?: () => void;
  showInvitations?: boolean;
  isInvitationsView?: boolean;
  isUsersView?: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  collections,
  singleTypes,
  activeSection,
  selectedCollectionId,
  selectedSingleId,
  onSelectCollection,
  onSelectSingle,
  onCreateCollection,
  onCreateSingle,
  onNavigateToHome,
  onNavigateToMedia,
  onNavigateToInvitations,
  onNavigateToUsers,
  showInvitations,
  isInvitationsView,
  isUsersView,
  isOpen,
  onToggle
}: Props) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden shadow-lg"
        onClick={onToggle}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-72 bg-card border-r border-border/50 transition-transform duration-300 ease-in-out overflow-y-auto",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <button
            onClick={() => {
              onNavigateToHome();
              if (window.innerWidth < 1024) onToggle();
            }}
            className="p-6 border-b border-border/50 text-left hover:bg-accent/5 transition-colors duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold tracking-tight text-foreground">
                Editorial CMS
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium tracking-wide ml-7">
              Content Management
            </p>
          </button>

          {/* Navigation */}
          <nav className="flex-1 p-4 pb-6 space-y-6">
            {/* Collection Types Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Collection Types
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onCreateCollection}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Collections List */}
              <div className="space-y-1">
                {collections.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground italic">
                    No collections yet
                  </p>
                ) : (
                  collections.map((collection) => (
                    <button
                      key={collection.id}
                      onClick={() => {
                        onSelectCollection(collection);
                        if (window.innerWidth < 1024) onToggle();
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        "hover:bg-accent/10 hover:text-primary",
                        activeSection === 'collections' && selectedCollectionId === collection.id
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        activeSection === 'collections' && selectedCollectionId === collection.id && "rotate-90"
                      )} />
                      <span className="truncate capitalize">{collection.slug}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {collection.schema.length}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Single Types Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Single Types
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onCreateSingle}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Single Types List */}
              <div className="space-y-1">
                {singleTypes.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground italic">
                    No single types yet
                  </p>
                ) : (
                  singleTypes.map((single) => (
                    <button
                      key={single.id}
                      onClick={() => {
                        onSelectSingle(single);
                        if (window.innerWidth < 1024) onToggle();
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        "hover:bg-accent/10 hover:text-primary",
                        activeSection === 'single' && selectedSingleId === single.id
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        activeSection === 'single' && selectedSingleId === single.id && "rotate-90"
                      )} />
                      <span className="truncate">{single.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {single.schema.length}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Media Library Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Media
                  </h2>
                </div>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => {
                    onNavigateToMedia();
                    if (window.innerWidth < 1024) onToggle();
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    "hover:bg-accent/10 hover:text-primary",
                    activeSection === 'media'
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    activeSection === 'media' && "rotate-90"
                  )} />
                  <span>Library</span>
                </button>
              </div>
            </div>

            {showInvitations && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                      Administration
                    </h2>
                  </div>
                </div>

                <div className="space-y-1">
                  {onNavigateToUsers && (
                    <button
                      onClick={() => {
                        onNavigateToUsers();
                        if (window.innerWidth < 1024) onToggle();
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        "hover:bg-accent/10 hover:text-primary",
                        activeSection === 'admin' && isUsersView
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        activeSection === 'admin' && isUsersView && "rotate-90"
                      )} />
                      <Users className="h-4 w-4" />
                      <span>Utilisateurs</span>
                    </button>
                  )}
                  {onNavigateToInvitations && (
                    <button
                      onClick={() => {
                        onNavigateToInvitations();
                        if (window.innerWidth < 1024) onToggle();
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        "hover:bg-accent/10 hover:text-primary",
                        activeSection === 'admin' && isInvitationsView
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        activeSection === 'admin' && isInvitationsView && "rotate-90"
                      )} />
                      <Mail className="h-4 w-4" />
                      <span>Invitations</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border/50 space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-primary"
              asChild
            >
              <a href="mailto:support@hordeagence.com">
                <Mail className="h-4 w-4 mr-2" />
                <span className="font-medium">Support</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <a href="/">
                <ChevronRight className="h-4 w-4 mr-2" />
                <span className="font-medium">Back to Site</span>
              </a>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
