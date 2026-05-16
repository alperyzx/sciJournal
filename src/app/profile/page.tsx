'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
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

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) {}
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
    if (isNaN(from)) return setDragIndex(null);
    if (from === index) return setDragIndex(null);
    setSelected(prev => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(index, 0, item);
      return arr;
    });
    setDragIndex(null);
  };

  const onDragEnd = () => {
    setDragIndex(null);
  };

  // Touch / swipe-to-remove state
  const touchStartX = useRef<number | null>(null);
  const touchActiveIndex = useRef<number | null>(null);
  const [touchTranslate, setTouchTranslate] = useState<Record<number, number>>({});

  const onTouchStart = (e: React.TouchEvent, idx: number) => {
    touchStartX.current = e.touches[0].clientX;
    touchActiveIndex.current = idx;
    setTouchTranslate(prev => ({ ...prev, [idx]: 0 }));
  };

  const onTouchMove = (e: React.TouchEvent, idx: number) => {
    if (touchActiveIndex.current !== idx) return;
    const cur = e.touches[0].clientX;
    const start = touchStartX.current ?? cur;
    const delta = cur - start; // positive = right, negative = left
    if (delta < 0) {
      setTouchTranslate(prev => ({ ...prev, [idx]: Math.max(delta, -200) }));
    }
  };

  const onTouchEnd = (e: React.TouchEvent, idx: number) => {
    const translate = touchTranslate[idx] ?? 0;
    touchStartX.current = null;
    touchActiveIndex.current = null;
    if (translate <= -80) {
      // remove item
      setSelected(prev => prev.filter((_, i) => i !== idx));
      // clean up translate map
      setTouchTranslate(prev => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    } else {
      setTouchTranslate(prev => ({ ...prev, [idx]: 0 }));
    }
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
                <label key={j} className="flex items-center gap-3 p-3 border rounded-xl bg-white/80 dark:bg-gray-950/70 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-blue-400 dark:hover:border-cyan-500 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(j)}
                    onChange={() => toggle(j)}
                    style={{ accentColor: 'currentColor' }}
                    className="h-4 w-4 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900"
                  />
                  <span className="text-sm leading-snug">{j}</span>
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
                {selected.map((name, idx) => {
                  const translate = touchTranslate[idx] ?? 0;
                  const removeOpacity = Math.min(Math.abs(translate) / 80, 1);
                  return (
                    <div key={name} className="relative">
                      <div
                        className="absolute inset-0 flex items-center justify-end pr-4 text-red-400 select-none pointer-events-none"
                        style={{ opacity: removeOpacity, transform: `translateX(${Math.min(40, Math.abs(translate) / 2)}px)` }}
                      >
                        Remove
                      </div>
                      <li
                        className={`relative flex items-center justify-between p-2 border rounded bg-transparent ${dragIndex === idx ? 'opacity-70' : ''}`}
                        draggable
                        onDragStart={(e) => onDragStart(e, idx)}
                        onDragOver={(e) => onDragOver(e, idx)}
                        onDrop={(e) => onDrop(e, idx)}
                        onDragEnd={onDragEnd}
                        aria-grabbed={dragIndex === idx}
                        onTouchStart={(e) => onTouchStart(e, idx)}
                        onTouchMove={(e) => onTouchMove(e, idx)}
                        onTouchEnd={(e) => onTouchEnd(e, idx)}
                        style={{
                          transform: `translateX(${translate}px)`,
                          transition: translate ? 'none' : 'transform 180ms ease',
                        }}
                      >
                        <span>{name}</span>
                        <div className="text-sm text-gray-400">Drag</div>
                      </li>
                    </div>
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
