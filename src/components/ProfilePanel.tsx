'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { Check, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import UpvotedPanel from '@/components/UpvotedPanel';
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

let journalsLoadPromise: Promise<string[]> | null = null;

const loadJournalsOnce = async () => {
  if (!journalsLoadPromise) {
    journalsLoadPromise = fetch('/api/journals')
      .then(async (res) => {
        const data = await res.json();
        return Array.isArray(data) ? data.map((j: any) => j.journalName) : [];
      })
      .catch(() => [])
      .finally(() => {
        journalsLoadPromise = null;
      });
  }

  return journalsLoadPromise;
};

export default function ProfilePanel() {
  const { data: session, status } = useSession();
  const [name, setName] = useState('');
  const [journals, setJournals] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [dragJournal, setDragJournal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaQuestion, setCaptchaQuestion] = useState<string | null>(null);
  const activePointerJournal = useRef<string | null>(null);
  const [showUpvotes, setShowUpvotes] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') return;
    if (session?.user) {
      setName(session.user.name ?? '');
      const prefs = (session.user as any).selectedJournals as string[] | undefined;
      if (prefs) setSelected(prefs);
    }
  }, [session, status]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const names = await loadJournalsOnce();
      if (!cancelled) {
        setJournals(names);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
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
    <>
      <div className="w-full max-w-[95vw] sm:max-w-3xl bg-white/95 dark:bg-gray-900/95 p-4 sm:p-8 rounded-2xl shadow-lg border border-gray-200/70 dark:border-gray-700/70 backdrop-blur-sm">
        <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-5 shadow-sm dark:border-blue-900/40 dark:from-blue-950/30 dark:via-gray-900 dark:to-cyan-950/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">SciJournal Digest</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                Personalize your scientific discovery
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display name</label>
            <div className="flex items-center gap-3">
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 sm:w-1/2 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <Button onClick={() => setShowUpvotes(true)} className="hidden sm:inline-flex rounded-full px-4">View upvotes</Button>
              <Button onClick={() => setShowUpvotes(true)} className="sm:hidden rounded-full px-3 py-2">Upvotes</Button>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-300">Selected journals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {journals.map(j => (
                <label
                  key={j}
                  className={`flex items-center gap-3 p-2 sm:p-3 border rounded-xl transition-all cursor-pointer ${selected.includes(j)
                    ? 'border-blue-500 bg-blue-50 text-blue-950 shadow-sm dark:border-cyan-400 dark:bg-slate-900 dark:text-slate-100'
                    : 'bg-white/80 dark:bg-gray-950/70 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-blue-400 dark:hover:border-cyan-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(j)}
                    onChange={() => toggle(j)}
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600 focus:ring-blue-500 dark:[color-scheme:dark] dark:border-gray-700 dark:bg-gray-800 dark:accent-cyan-500"
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
                      className={`relative flex items-center justify-between gap-3 rounded border px-2 py-1 sm:px-3 sm:py-2 ${isDragging ? 'border-blue-500 bg-blue-50/80 shadow-sm dark:border-cyan-400 dark:bg-cyan-950/25' : 'border-gray-200 bg-white/70 dark:border-gray-700 dark:bg-gray-950/60'}`}
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
            <Button onClick={save} disabled={loading} className="rounded-full px-4 sm:px-6 bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-lg hover:from-blue-700 hover:to-teal-600">
              Save profile
            </Button>
          </div>

          <Dialog open={showUpvotes} onOpenChange={setShowUpvotes}>
            <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl mx-2 sm:mx-auto">
                <DialogTitle className="sr-only">Upvoted articles</DialogTitle>
                <UpvotedPanel onClose={() => setShowUpvotes(false)} />
              </DialogContent>
          </Dialog>

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
    </>
  );
}
