'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Edit, Plus, Eye, Settings, RefreshCw, LogOut } from 'lucide-react';

interface Journal {
  id?: string;
  journalName: string;
  url: string;
  type: 'standard' | 'sciencedirect';
}

const AdminConsole: React.FC = () => {
  const { data: session, status } = useSession();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [editingJournal, setEditingJournal] = useState<Journal | null>(null);
  const [newJournal, setNewJournal] = useState<Journal>({
    journalName: '',
    url: '',
    type: 'standard'
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      loadJournals();
    }
  }, [session]);

  const loadJournals = async () => {
    try {
      const response = await fetch('/api/admin/journals');
      if (response.ok) {
        const data = await response.json();
        setJournals(data);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load journals' });
    }
  };

  const saveJournal = async (journal: Journal, isEdit: boolean = false) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/journals', {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(journal),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Journal ${isEdit ? 'updated' : 'added'} successfully` });
        loadJournals();
        setNewJournal({ journalName: '', url: '', type: 'standard' });
        setEditingJournal(null);
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to save journal' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while saving journal' });
    }
    setLoading(false);
  };

  const deleteJournal = async (journal: Journal) => {
    if (!confirm(`Are you sure you want to delete "${journal.journalName}"?`)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/journals', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ journalName: journal.journalName }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Journal deleted successfully' });
        loadJournals();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to delete journal' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while deleting journal' });
    }
    setLoading(false);
  };

  const testJournalFeed = async (url: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/test-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: `Feed test successful! Found ${result.articleCount} articles` });
      } else {
        setMessage({ type: 'error', text: result.message || 'Feed test failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while testing feed' });
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
              Sign in with Google to access admin features
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              SciJournal Admin Console
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage journal RSS feeds and configurations
            </p>
          </div>
          <Button onClick={() => signOut()} variant="outline" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Messages */}
        {message && (
          <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
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

          <Button onClick={loadJournals} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Journals List */}
        <div className="grid gap-4">
          {journals.map((journal, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow" data-testid="journal-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        {journal.journalName}
                      </h3>
                      <Badge variant={journal.type === 'sciencedirect' ? 'default' : 'secondary'}>
                        {journal.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
                      {journal.url}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testJournalFeed(journal.url)}
                      disabled={loading}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
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
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteJournal(journal)}
                      disabled={loading}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
}

const JournalForm: React.FC<JournalFormProps> = ({ journal, setJournal, onSave, onTest, loading }) => {
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
      
      <div className="flex gap-2 pt-4">
        <Button onClick={onSave} disabled={loading || !journal.journalName || !journal.url}>
          {loading ? 'Saving...' : 'Save Journal'}
        </Button>
        <Button onClick={onTest} variant="outline" disabled={loading || !journal.url}>
          {loading ? 'Testing...' : 'Test Feed'}
        </Button>
      </div>
    </div>
  );
};

export default AdminConsole;
