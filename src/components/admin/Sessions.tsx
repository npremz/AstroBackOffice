import { useEffect, useState } from 'react';
import { Monitor, Smartphone, Globe, Trash2, LogOut, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { apiFetch, apiPost } from '@/lib/api-client';

type Session = {
  id: number;
  userId: number;
  expiresAt: string | number;
  createdAt: string | number;
  userAgent: string | null;
  ip: string | null;
  isCurrent: boolean;
};

function parseUserAgent(ua: string | null): { device: string; browser: string; icon: typeof Monitor } {
  if (!ua) return { device: 'Unknown', browser: 'Unknown', icon: Globe };

  const isMobile = /mobile|android|iphone|ipad/i.test(ua);
  const icon = isMobile ? Smartphone : Monitor;

  let browser = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  let device = 'Desktop';
  if (/iphone/i.test(ua)) device = 'iPhone';
  else if (/ipad/i.test(ua)) device = 'iPad';
  else if (/android/i.test(ua)) device = 'Android';
  else if (/mac/i.test(ua)) device = 'Mac';
  else if (/windows/i.test(ua)) device = 'Windows';
  else if (/linux/i.test(ua)) device = 'Linux';

  return { device, browser, icon };
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/sessions');
      if (!response.ok) throw new Error('Failed to load sessions');
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevokeSession = async (sessionId: number) => {
    setRevoking(sessionId);
    try {
      const response = await apiFetch(`/api/auth/sessions?id=${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data?.error || 'Failed to revoke session');
        return;
      }

      const session = sessions.find(s => s.id === sessionId);
      if (session?.isCurrent) {
        window.location.href = '/login';
        return;
      }

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session revoked');
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setRevoking(null);
    }
  };

  const handleLogoutAll = async (keepCurrent: boolean) => {
    setRevokingAll(true);
    try {
      const result = await apiPost<{ success: boolean; sessionsRevoked: number }>('/api/auth/sessions/logout-all', {
        keepCurrent,
      });

      if (result.success) {
        if (!keepCurrent) {
          window.location.href = '/login';
          return;
        }
        toast.success(`${result.sessionsRevoked} session(s) revoked`);
        loadSessions();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to logout all sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  const formatDate = (value: string | number) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const otherSessionsCount = sessions.filter(s => !s.isCurrent).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Active Sessions</h2>
        <p className="text-muted-foreground">
          Manage your active sessions across devices. You can revoke access to any session.
        </p>
      </div>

      {/* Logout All Sessions Card */}
      {otherSessionsCount > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Security Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={revokingAll}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout other sessions ({otherSessionsCount})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Logout other sessions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will revoke {otherSessionsCount} other session(s). Your current session will remain active.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleLogoutAll(true)}>
                      Logout other sessions
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={revokingAll}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout all sessions
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Logout all sessions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will revoke ALL sessions including your current one. You will be redirected to the login page.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleLogoutAll(false)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Logout all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Sessions</CardTitle>
          <CardDescription>
            {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No active sessions.
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => {
                    const { device, browser, icon: DeviceIcon } = parseUserAgent(session.userAgent);

                    return (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <DeviceIcon className="h-5 w-5 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="font-medium flex items-center gap-2">
                                {device}
                                {session.isCurrent && (
                                  <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                                    Current
                                  </Badge>
                                )}
                              </span>
                              <span className="text-sm text-muted-foreground">{browser}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {session.ip || 'Unknown'}
                          </code>
                        </TableCell>
                        <TableCell>{formatDate(session.createdAt)}</TableCell>
                        <TableCell>{formatDate(session.expiresAt)}</TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                disabled={revoking === session.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke session?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {session.isCurrent
                                    ? 'This is your current session. You will be logged out and redirected to the login page.'
                                    : 'This will end this session. The device will need to log in again.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRevokeSession(session.id)}
                                  className={session.isCurrent ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                                >
                                  Revoke
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
