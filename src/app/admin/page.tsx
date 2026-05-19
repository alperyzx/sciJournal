'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Edit, Plus, Eye, EyeOff, RefreshCw, LogOut, ChevronUp, ChevronDown, ArrowLeft, Search } from 'lucide-react';
import JournalCardCompact from '@/components/admin/JournalCardCompact';

interface Journal {
  id?: string;
  journalName: string;
  url: string;
  type: 'standard' | 'sciencedirect';
  order?: number;
  homeVisible?: boolean;
}
const AdminConsole: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newJournal, setNewJournal] = useState<Journal>({ journalName: '', url: '', type: 'standard' });
  const [editingJournal, setEditingJournal] = useState<Journal | null>(null);
  const [journalToDelete, setJournalToDelete] = useState<Journal | null>(null);

  const isAdmin = (session as any)?.user?.role === 'admin' || (session as any)?.user?.isAdmin === true;

  const loadJournals = async (opts?: { showLoading?: boolean }) => {
    if (opts?.showLoading) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/journals');
      if (res.ok) {
        const data = await res.json();
        setJournals(data.journals ?? data);
      } else {
        setMessage({ type: 'error', text: 'Failed to load journals' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error while loading journals' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const saveJournal = async (journal: Journal, isEdit = false) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/journals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(journal),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({ title: 'Journal saved successfully' });
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
        setNewJournal({ journalName: '', url: '', type: 'standard' });
        await loadJournals();
      } else {
        toast({ title: (result as any)?.message || 'Failed to save journal', variant: 'destructive' } as any);
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error while saving journal' });
    }
    setLoading(false);
  };

  const deleteJournal = async (journal: Journal) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/journals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journal }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        toast({ title: (result as any)?.message || 'Journal deleted' });
        await loadJournals();
      } else {
        setMessage({ type: 'error', text: (result as any)?.message || 'Failed to delete journal' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error while deleting journal' });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      loadJournals({ showLoading: true });
      return;
    }

    // Ensure login/non-admin views do not surface stale journal loading errors.
    setMessage(null);
    setJournals([]);
    setLoading(false);
    setRefreshing(false);
  }, [status, isAdmin]);

  const setJournalOrder = async (journal: Journal, order: number) => {
    // send full journal payload (PUT requires journalName and url)
    const payload = { ...journal, order };
    await saveJournal(payload, true);
  };

  const toggleHomeVisible = async (journal: Journal) => {
    const nextVisible = journal.homeVisible === false;
    await saveJournal({ ...journal, homeVisible: nextVisible }, true);
  };

  const moveJournal = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= journals.length) return;

    const a = journals[index];
    const b = journals[targetIndex];

    const aOrder = typeof a.order === 'number' ? a.order : index + 1;
    const bOrder = typeof b.order === 'number' ? b.order : targetIndex + 1;

    // optimistic UI
    const newJournals = [...journals];
    newJournals[index] = { ...a, order: bOrder };
    newJournals[targetIndex] = { ...b, order: aOrder };
    setJournals(newJournals);

    // persist both
    await setJournalOrder(newJournals[index], newJournals[index].order ?? aOrder);
    await setJournalOrder(newJournals[targetIndex], newJournals[targetIndex].order ?? bOrder);
    // reload to ensure canonical ordering
    await loadJournals();
  };

  const testJournalFeed = async (url: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/test-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const raw = await response.text();
      let result: { success?: boolean; message?: string; articleCount?: number } = {};

      try {
        result = raw ? JSON.parse(raw) : {};
      } catch {
        result = { message: raw || 'Unexpected response from feed test' };
      }

      if (response.ok && result.success !== false) {
        setMessage(null);
        const t = toast({ title: `Feed test successful! Found ${result.articleCount ?? 0} articles` });
        setTimeout(() => t.dismiss(), 4000);
      } else {
        const message = result.message || `Feed test failed (${response.status})`;
        setMessage({ type: 'error', text: message });
        const t = toast({ title: message, variant: 'destructive' } as any);
        setTimeout(() => t.dismiss(), 5000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Unable to reach feed test endpoint' });
    }
    setLoading(false);
  };

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4 text-base text-gray-600 dark:text-gray-400">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'authenticated' && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-base font-semibold text-red-600 dark:text-red-400">Access denied</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">You are signed in, but your account does not have admin access.</p>
            <Button onClick={() => router.push('/')} className="w-full">Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              SciJournal Admin Console
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sign in with Google or GitHub to access admin features
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => signIn('google')}
              className="w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>
            <Button
              onClick={() => signIn('github')}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.48 0-.24-.01-1.03-.01-1.87-2.78.63-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.49-1.11-1.49-.91-.63.07-.62.07-.62 1.01.07 1.54 1.06 1.54 1.06.9 1.58 2.37 1.12 2.95.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.33 9.33 0 0 1 12 6.82c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.67.96.67 1.94 0 1.4-.01 2.53-.01 2.87 0 .26.18.59.69.48A10.01 10.01 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
              </svg>
              Sign in with GitHub
            </Button>
            {message && (
              <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 px-3 py-4 sm:p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-5 sm:mb-8">
          <div className="flex items-start justify-between gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-300 sm:text-3xl">
                SciJournal Admin Console
              </h1>
              <p className="max-w-xl text-sm text-gray-600 dark:text-gray-400 sm:text-base">
                Manage journal RSS feeds and configurations
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                aria-label="Back to Home"
                className="flex h-10 w-10 items-center justify-center px-0 sm:w-auto sm:px-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:truncate">Back to Home</span>
              </Button>
              <Button
                onClick={() => signOut()}
                variant="outline"
                aria-label="Sign Out"
                className="flex h-10 w-10 items-center justify-center px-0 sm:w-auto sm:px-4"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:truncate">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Actions Bar */}
        <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex w-full min-w-0 items-center justify-center gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                Add Journal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Journal</DialogTitle>
              </DialogHeader>
              <JournalForm
                journal={newJournal}
                setJournal={setNewJournal}
                onSave={() => saveJournal(newJournal)}
                onTest={() => testJournalFeed(newJournal.url)}
                loading={loading}
              />
            </DialogContent>
          </Dialog>
          {/* Delete confirmation dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Delete</DialogTitle>
              </DialogHeader>
              <div className="py-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Are you sure you want to delete "{journalToDelete?.journalName}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!journalToDelete) return;
                    await deleteJournal(journalToDelete);
                    setIsDeleteDialogOpen(false);
                    // If we were editing the same journal, close the edit dialog
                    if (editingJournal?.journalName === journalToDelete.journalName) {
                      setIsEditDialogOpen(false);
                    }
                    setJournalToDelete(null);
                  }}
                  disabled={loading}
                >
                  Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={() => loadJournals({ showLoading: true })}
            variant="outline"
            className="flex w-full min-w-0 items-center justify-center gap-2 sm:w-auto"
            disabled={refreshing || loading}
            aria-busy={refreshing}
          >
            {refreshing ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true"></span>
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Desktop Journals List */}
        <div className="hidden gap-4 sm:grid">
          {journals.map((journal, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow" data-testid="journal-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300">
                        {journal.journalName}
                      </h3>
                      <Badge variant={journal.type === 'sciencedirect' ? 'default' : 'secondary'}>
                        {journal.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
                      {journal.url}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={journal.homeVisible === false ? 'outline' : 'default'}>
                        {journal.homeVisible === false ? 'Hidden from home' : 'Visible on home'}
                      </Badge>
                      {typeof journal.order === 'number' && (
                        <Badge variant="secondary">Order {journal.order}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 mr-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleHomeVisible(journal)}
                        aria-label={journal.homeVisible === false ? `Show ${journal.journalName} on home` : `Hide ${journal.journalName} from home`}
                        className="p-1"
                      >
                        {journal.homeVisible === false ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveJournal(index, 'up')}
                        aria-label={`Move ${journal.journalName} up`}
                        className="p-1"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => moveJournal(index, 'down')}
                        aria-label={`Move ${journal.journalName} down`}
                        className="p-1"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testJournalFeed(journal.url)}
                      disabled={loading}
                      className="flex items-center gap-1"
                    >
                      <Search className="h-3 w-3" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingJournal(journal);
                        setIsEditDialogOpen(true);
                      }}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    {/* Delete moved into Edit dialog to avoid accidental clicks */}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile Journals List */}
        <div className="space-y-3 sm:hidden">
          {journals.map((journal, index) => (
            <JournalCardCompact
              key={journal.id ?? journal.journalName ?? index}
              journal={journal}
              onEdit={(j) => {
                setEditingJournal(j);
                setIsEditDialogOpen(true);
              }}
              onTest={(url) => testJournalFeed(url)}
              loading={loading}
            />
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Journal</DialogTitle>
            </DialogHeader>
            {editingJournal && (
              <JournalForm
                journal={editingJournal}
                setJournal={setEditingJournal}
                onSave={() => saveJournal(editingJournal, true)}
                onTest={() => testJournalFeed(editingJournal.url)}
                onDelete={() => {
                  setJournalToDelete(editingJournal);
                  setIsDeleteDialogOpen(true);
                }}
                loading={loading}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Journal Form Component
interface JournalFormProps {
  journal: Journal;
  setJournal: (journal: Journal) => void;
  onSave: () => void;
  onTest: () => void;
  loading: boolean;
  onDelete?: () => void;
}

const JournalForm: React.FC<JournalFormProps> = ({ journal, setJournal, onSave, onTest, loading, onDelete }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Journal Name</label>
        <Input
          value={journal.journalName}
          onChange={(e) => setJournal({ ...journal, journalName: e.target.value })}
          placeholder="Enter journal name"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">RSS Feed URL</label>
        <Input
          value={journal.url}
          onChange={(e) => setJournal({ ...journal, url: e.target.value })}
          placeholder="https://example.com/rss"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Feed Type</label>
        <Select value={journal.type} onValueChange={(value: 'standard' | 'sciencedirect') => setJournal({ ...journal, type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard RSS</SelectItem>
            <SelectItem value="sciencedirect">ScienceDirect</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center justify-between pt-4">
        <div className="flex gap-2">
          <Button onClick={onSave} disabled={loading || !journal.journalName || !journal.url}>
            {loading ? 'Saving...' : 'Save Journal'}
          </Button>
          <Button onClick={onTest} variant="outline" disabled={loading || !journal.url}>
            {loading ? 'Testing...' : 'Test Feed'}
          </Button>
        </div>
        {onDelete && (
          <div className="ml-4">
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${journal.journalName}`}
              className="text-sm font-medium text-destructive hover:underline dark:text-destructive-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30 focus:ring-offset-2 rounded-sm disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminConsole;
