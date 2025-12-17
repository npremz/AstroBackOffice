import { useEffect, useMemo, useState } from 'react';
import { UserPlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordStrength } from '@/components/ui/password-strength';

export default function AcceptInvitationForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => new URLSearchParams(window.location.search).get('token'), []);

  useEffect(() => {
    if (!token) {
      setError('Lien d’invitation invalide ou manquant.');
    }
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password, name }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        // Show detailed validation errors if available
        if (data?.details && Array.isArray(data.details)) {
          setError(data.details.join('\n'));
        } else {
          setError(data?.error || 'Impossible d\'accepter l\'invitation.');
        }
        return;
      }

      window.location.href = '/admin';
    } catch (e) {
      console.error('Accept invitation failed', e);
      setError('Une erreur est survenue. Merci de réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/60 to-background px-4 py-12">
      <Card className="max-w-md w-full shadow-xl border-border/60">
        <CardHeader className="space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-1">
            <UserPlus2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Accepter l’invitation</CardTitle>
          <CardDescription>
            Créez votre compte pour accéder au backoffice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="invité@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom (optionnel)</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <PasswordStrength password={password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading ? 'Création du compte...' : 'Accepter et créer le compte'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
