'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
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

  // `/admin` is protected server-side by middleware. Avoid displaying a separate
  // client-side sign-in or access-denied screen while the session is hydrating.
  if (!isAdmin) return null;

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
