'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Check, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface UpvotedArticle {
  id: string;
  journalName: string;
  title: string;
  link?: string;
  publicationDate: string;
  upvotedAt?: string | null;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [journals, setJournals] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [dragJournal, setDragJournal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [upvotedArticles, setUpvotedArticles] = useState<UpvotedArticle[]>([]);
  const [upvotedLoading, setUpvotedLoading] = useState(false);
  const [pendingUnvote, setPendingUnvote] = useState<UpvotedArticle | null>(null);
  const [unvotingId, setUnvotingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaQuestion, setCaptchaQuestion] = useState<string | null>(null);
  const activePointerJournal = useRef<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    if (session?.user) {
      setName(session.user.name ?? '');
      const prefs = (session.user as any).selectedJournals as string[] | undefined;
      if (prefs) setSelected(prefs);
    }
  }, [session, status, router]);

  const isOnboarding = !!(session?.user && !(session.user as any).onboardingComplete);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void loadUpvotedArticles();
  }, [status]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/journals');
      const data = await res.json();
      setJournals(data.map((j: any) => j.journalName));
    };
    load();
  }, []);

  const toggle = (name: string) => {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const moveSelectedJournal = (fromJournal: string, toJournal: string) => {
    setSelected(prev => {
      const fromIndex = prev.indexOf(fromJournal);
      const toIndex = prev.indexOf(toJournal);

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return prev;
      }

      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const onDragStart = (e: React.DragEvent, journal: string) => {
    setDragJournal(journal);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', journal); } catch (err) {}
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent, journal: string) => {
    e.preventDefault();
    const fromJournal = dragJournal ?? e.dataTransfer.getData('text/plain');
    if (!fromJournal || fromJournal === journal) {
      setDragJournal(null);
      return;
    }

    moveSelectedJournal(fromJournal, journal);
    setDragJournal(null);
  };

  const onDragEnd = () => {
    setDragJournal(null);
    activePointerJournal.current = null;
  };

  const onPointerDownJournal = (e: React.PointerEvent<HTMLButtonElement>, journal: string) => {
    if (e.button !== 0) return;
    activePointerJournal.current = journal;
    setDragJournal(journal);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const onPointerMoveJournal = (e: React.PointerEvent<HTMLButtonElement>) => {
    const activeJournal = activePointerJournal.current;
    if (!activeJournal) return;

    const element = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-journal-item]') as HTMLElement | null;
    const targetJournal = element?.dataset.journalItem;
    if (!targetJournal || targetJournal === activeJournal) return;

    moveSelectedJournal(activeJournal, targetJournal);
  };

  const finishPointerDrag = () => {
    activePointerJournal.current = null;
    setDragJournal(null);
  };

  const refreshUpvotedArticles = async () => {
    const res = await fetch('/api/user/upvoted-articles');
    if (!res.ok) {
      setUpvotedArticles([]);
      return;
    }

    const data = await res.json();
    setUpvotedArticles(Array.isArray(data) ? data : []);
  };

  const loadUpvotedArticles = async () => {
    setUpvotedLoading(true);
    try {
      await refreshUpvotedArticles();
    } catch (error) {
      setUpvotedArticles([]);
    } finally {
      setUpvotedLoading(false);
    }
  };

  const confirmUnvote = async () => {
    if (!pendingUnvote) return;

    const removedId = pendingUnvote.id;
    setUnvotingId(removedId);
    try {
      const response = await fetch('/api/articles/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: pendingUnvote.id }),
      });

      if (!response.ok) throw new Error('Unvote failed');

      setUpvotedArticles(prev => prev.filter(article => article.id !== removedId));
    } catch (error) {
      // keep the current list if the toggle fails
    } finally {
      setUnvotingId(null);
      setPendingUnvote(null);
    }
  };

  const onConfirmDelete = async () => {
    setCaptchaError(null);
    const answer = captcha.trim();
    if (!captchaToken) {
      setCaptchaError('Confirmation token missing. Please retry.');
      return;
    }
    if (answer.length === 0) {
      setCaptchaError('Please enter your answer');
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captchaToken, answer }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setCaptchaError(body?.message || 'Failed to delete account');
        return;
      }

      // sign out and redirect to home
      await signOut({ callbackUrl: '/' });
    } catch (e) {
      setCaptchaError('Server error. Please try again.');
    } finally {
      setDeleteLoading(false);
      setPendingDelete(false);
    }
  };

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, selectedJournals: selected }) });
      if (!res.ok) throw new Error('Save failed');
      // Force a full reload so NextAuth session and UI reflect updated name immediately
      window.location.href = '/';
    } catch (e) {
      // ignore
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-white to-cyan-50 text-foreground dark:from-gray-950 dark:via-slate-950 dark:to-gray-900">
      <div className="w-full max-w-3xl bg-white/95 dark:bg-gray-900/95 p-8 rounded-2xl shadow-lg border border-gray-200/70 dark:border-gray-700/70 backdrop-blur-sm">
        {isOnboarding ? (
          <>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-300">Welcome — set your profile</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Select and order journals you want to see on your home screen.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-300">Profile & Preferences</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Update your display name and choose the journals you want on your home screen.</p>
          </>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full sm:w-1/2 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-300">Selected journals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {journals.map(j => (
                <label
                  key={j}
                  className={`flex items-center gap-3 p-3 border rounded-xl transition-all cursor-pointer ${selected.includes(j)
                    ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-sm dark:border-cyan-400 dark:bg-cyan-950/35 dark:text-cyan-50'
                    : 'bg-white/80 dark:bg-gray-950/70 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-blue-400 dark:hover:border-cyan-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(j)}
                    onChange={() => toggle(j)}
                    style={{ accentColor: 'currentColor' }}
                    className="h-4 w-4 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900"
                  />
                  <span className="text-sm leading-snug flex-1">{j}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-300">Order selected journals</h3>
            {selected.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No journals selected yet.</p>
            ) : (
              <ul className="space-y-2">
                {selected.map((name) => {
                  const isDragging = dragJournal === name;
                  return (
                    <li
                      key={name}
                      data-journal-item={name}
                      className={`relative flex items-center justify-between gap-3 rounded border px-3 py-2 ${isDragging ? 'border-blue-500 bg-blue-50/80 shadow-sm dark:border-cyan-400 dark:bg-cyan-950/25' : 'border-gray-200 bg-white/70 dark:border-gray-700 dark:bg-gray-950/60'}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, name)}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, name)}
                      onDragEnd={onDragEnd}
                      aria-grabbed={isDragging}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-gray-100">{name}</span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-400 dark:hover:border-cyan-500 dark:hover:bg-cyan-950/40 dark:hover:text-cyan-200"
                        aria-label={`Drag ${name} to reorder`}
                        title="Drag to reorder"
                        style={{ touchAction: 'none' }}
                        onPointerDown={(e) => onPointerDownJournal(e, name)}
                        onPointerMove={onPointerMoveJournal}
                        onPointerUp={finishPointerDrag}
                        onPointerCancel={finishPointerDrag}
                      >
                        <GripVertical className="h-4 w-4" />
                        <span className="hidden sm:inline">Drag</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex justify-end gap-2">
            {!isOnboarding && (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
                className="rounded-full px-6 border-gray-200 bg-white/80 text-gray-700 shadow-none hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-200 dark:hover:bg-gray-900"
              >
                Back
              </Button>
            )}

            <Button onClick={save} disabled={loading} className="rounded-full px-6 bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-lg hover:from-blue-700 hover:to-teal-600">
              {isOnboarding ? 'Save and continue' : 'Save'}
            </Button>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-300">Upvoted articles</h2>
            {upvotedLoading && upvotedArticles.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading your upvoted articles...</p>
            ) : upvotedArticles.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No upvoted articles yet.</p>
            ) : (
              <ul className="space-y-2">
                {upvotedArticles.map(article => (
                  <li key={article.id} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-950/60 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{article.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{article.journalName}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {article.link ? (
                        <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                          Read
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 whitespace-nowrap">Saved</span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[11px] font-medium border-gray-200 bg-white/70 text-gray-500 shadow-none hover:bg-red-50 hover:text-red-700 dark:border-gray-700 dark:bg-gray-950/60 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                        disabled={unvotingId === article.id}
                        onClick={() => setPendingUnvote(article)}
                      >
                        {unvotingId === article.id ? 'Removing...' : 'Unvote'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="sr-only">Delete account</h2>
            <div>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="text-red-700 dark:text-red-300 hover:underline focus-visible:ring-red-300"
                onClick={async () => {
                  setCaptcha('');
                  setCaptchaError(null);
                  setCaptchaToken(null);
                  setCaptchaQuestion(null);
                  setPendingDelete(true);
                  try {
                    const r = await fetch('/api/user/delete-account/captcha');
                    if (!r.ok) throw new Error('Failed to get captcha');
                    const d = await r.json();
                    setCaptchaToken(d.token);
                    setCaptchaQuestion(d.question);
                  } catch (e) {
                    setCaptchaError('Could not load confirmation question. Please try again.');
                  }
                }}
              >
                Delete account
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!pendingUnvote} onOpenChange={(open) => {
        if (!open) setPendingUnvote(null);
      }}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-300">Remove this article from your upvoted list?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              This will unvote the article and remove it from your saved upvoted articles section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnvote} className="bg-red-600 text-white hover:bg-red-700">
              Remove vote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingDelete} onOpenChange={(open) => {
        if (!open) setPendingDelete(false);
      }}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-300">Delete your account?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              This will permanently delete your account and remove any upvotes you've made. This action cannot be undone. To confirm, answer the following question.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="px-6 pb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{captchaQuestion ?? 'Answer the question'}</label>
            <Input value={captcha} onChange={e => setCaptcha(e.target.value)} className="mb-2" />
            {captchaError ? <div className="text-sm text-red-600 dark:text-red-400">{captchaError}</div> : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-red-600 text-white hover:bg-red-700" disabled={deleteLoading || !captchaToken}>
              {deleteLoading ? 'Deleting...' : 'Delete account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
