import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Search, Filter, Clock, User, Activity, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AuditLog {
  id: number;
  userId: number | null;
  userEmail: string;
  userName: string | null;
  action: string;
  resourceType: string;
  resourceId: number | null;
  resourceName: string | null;
  changes: { before?: Record<string, any>; after?: Record<string, any> } | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface PaginatedResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-500/10 text-green-700 border-green-500/20',
  UPDATE: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  DELETE: 'bg-red-500/10 text-red-700 border-red-500/20',
  PUBLISH: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  LOGIN: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
  LOGOUT: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  INVITE: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
};

const resourceTypeLabels: Record<string, string> = {
  Entry: 'Entrée',
  Collection: 'Collection',
  User: 'Utilisateur',
  Media: 'Média',
  ContentModule: 'Module de contenu',
  Session: 'Session',
  Invitation: 'Invitation',
};

const actionLabels: Record<string, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  PUBLISH: 'Publication',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  INVITE: 'Invitation',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '20');

      if (search) params.set('search', search);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (resourceTypeFilter !== 'all') params.set('resourceType', resourceTypeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data: PaginatedResponse = await response.json();
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, resourceTypeFilter, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const renderChanges = (changes: { before?: Record<string, any>; after?: Record<string, any> } | null) => {
    if (!changes) return null;

    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm space-y-2">
        {changes.before && (
          <div>
            <span className="font-medium text-red-600">Avant:</span>
            <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(changes.before, null, 2)}
            </pre>
          </div>
        )}
        {changes.after && (
          <div>
            <span className="font-medium text-green-600">Après:</span>
            <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(changes.after, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs d'audit</h1>
          <p className="text-muted-foreground mt-1">
            Historique des modifications ({total} entrées)
          </p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher (email, ressource...)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button variant="secondary" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="CREATE">Création</SelectItem>
                <SelectItem value="UPDATE">Modification</SelectItem>
                <SelectItem value="DELETE">Suppression</SelectItem>
                <SelectItem value="PUBLISH">Publication</SelectItem>
                <SelectItem value="LOGIN">Connexion</SelectItem>
                <SelectItem value="LOGOUT">Déconnexion</SelectItem>
                <SelectItem value="INVITE">Invitation</SelectItem>
              </SelectContent>
            </Select>

            <Select value={resourceTypeFilter} onValueChange={(v) => { setResourceTypeFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Type de ressource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="Entry">Entrée</SelectItem>
                <SelectItem value="Collection">Collection</SelectItem>
                <SelectItem value="ContentModule">Module de contenu</SelectItem>
                <SelectItem value="User">Utilisateur</SelectItem>
                <SelectItem value="Media">Média</SelectItem>
                <SelectItem value="Session">Session</SelectItem>
                <SelectItem value="Invitation">Invitation</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="SUCCESS">Succès</SelectItem>
                <SelectItem value="FAILED">Échec</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-50" />
              <p>Aucun log trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Status icon */}
                      {log.status === 'SUCCESS' ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )}

                      {/* Action badge */}
                      <Badge variant="outline" className={actionColors[log.action] || ''}>
                        {actionLabels[log.action] || log.action}
                      </Badge>

                      {/* Resource info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {resourceTypeLabels[log.resourceType] || log.resourceType}
                          </span>
                          {log.resourceName && (
                            <span className="text-muted-foreground truncate">
                              "{log.resourceName}"
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          <span>{log.userName || log.userEmail}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedLog === log.id && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Email:</span>{' '}
                          <span className="font-mono">{log.userEmail}</span>
                        </div>
                        {log.ipAddress && (
                          <div>
                            <span className="text-muted-foreground">IP:</span>{' '}
                            <span className="font-mono">{log.ipAddress}</span>
                          </div>
                        )}
                        {log.resourceId && (
                          <div>
                            <span className="text-muted-foreground">ID Ressource:</span>{' '}
                            <span className="font-mono">{log.resourceId}</span>
                          </div>
                        )}
                        {log.errorMessage && (
                          <div className="sm:col-span-2">
                            <span className="text-red-500">Erreur:</span>{' '}
                            <span>{log.errorMessage}</span>
                          </div>
                        )}
                      </div>

                      {log.changes && renderChanges(log.changes)}

                      {log.userAgent && (
                        <div className="text-xs text-muted-foreground truncate">
                          <span className="font-medium">User Agent:</span> {log.userAgent}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
