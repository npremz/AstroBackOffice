import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

type Invitation = {
  id: number;
  email: string;
  role: string;
  expiresAt: string | number;
  invitedBy: number | null;
  acceptedAt: string | number | null;
  createdAt: string | number;
  revoked: boolean;
};

const roles = [
  { value: 'super_admin', label: 'Super admin' },
  { value: 'editor', label: 'Éditeur' },
  { value: 'viewer', label: 'Lecteur' },
] as const;

export default function Invitations() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<typeof roles[number]['value']>('editor');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestToken, setLatestToken] = useState<string | null>(null);

  const loadInvitations = async () => {
    setError(null);
    try {
      const response = await fetch('/api/auth/invitations');
      if (!response.ok) {
        throw new Error('Failed to load invitations');
      }
      const data = await response.json();
      setInvitations(data);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les invitations.');
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setLatestToken(null);

    try {
      const response = await apiFetch('/api/auth/invitations', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || 'Création impossible');
        return;
      }

      if (data.invitation) {
        setInvitations((prev) => [data.invitation, ...prev.filter((inv) => inv.id !== data.invitation.id)]);
      }
      if (data.token) {
        setLatestToken(data.token);
      }
      setEmail('');
      toast.success('Invitation créée');
    } catch (err) {
      console.error(err);
      setError('Une erreur est survenue lors de la création.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: string | number | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString();
  };

  const statusBadge = (invitation: Invitation) => {
    if (invitation.revoked) return <Badge variant="outline" className="border-destructive/50 text-destructive">Révoquée</Badge>;
    if (invitation.acceptedAt) return <Badge variant="default">Acceptée</Badge>;
    const expired = new Date(invitation.expiresAt).getTime() < Date.now();
    if (expired) return <Badge variant="secondary">Expirée</Badge>;
    return <Badge variant="outline" className="border-primary/40 text-primary">Active</Badge>;
  };

  const invitationLink = useMemo(() => {
    if (!latestToken) return null;
    const url = new URL('/accept-invitation', window.location.origin);
    url.searchParams.set('token', latestToken);
    return url.toString();
  }, [latestToken]);

  const handleDelete = async (id: number) => {
    try {
      const response = await apiFetch(`/api/auth/invitations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data?.error || "Impossible de supprimer l'invitation");
        return;
      }

      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      toast.success('Invitation supprimée');
    } catch (err) {
      console.error(err);
      toast.error('Une erreur est survenue');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Invitations</h2>
        <p className="text-muted-foreground">
          Créez et suivez les invitations pour les nouveaux utilisateurs. Seuls les super admins peuvent gérer ces accès.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle invitation</CardTitle>
          <CardDescription>Envoyez un accès à un collaborateur.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <form className="grid gap-4 sm:grid-cols-3" onSubmit={handleCreate}>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="utilisateur@exemple.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Sélectionnez un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Création...' : 'Créer l’invitation'}
              </Button>
            </div>
          </form>

          {latestToken && (
            <div className="mt-4 p-4 border border-primary/30 rounded-lg bg-primary/5 space-y-2">
              <p className="text-sm font-semibold text-primary">Invitation générée</p>
              <p className="text-sm break-all font-mono">{latestToken}</p>
              {invitationLink && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground break-all">{invitationLink}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => navigator.clipboard?.writeText(invitationLink)}
                  >
                    Copier
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des invitations</CardTitle>
          <CardDescription>Suivez les invitations actives et expirées.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Expire le</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Aucune invitation pour le moment.
                  </TableCell>
                </TableRow>
              ) : invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{invitation.role}</Badge>
                  </TableCell>
                  <TableCell>{statusBadge(invitation)}</TableCell>
                  <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
                  <TableCell>{formatDate(invitation.createdAt)}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer l'invitation ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. L'invitation pour {invitation.email} sera définitivement supprimée.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(invitation.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
