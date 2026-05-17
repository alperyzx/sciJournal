'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface UpvotedArticle {
  id: string;
  journalName: string;
  title: string;
  link?: string;
  publicationDate: string;
}

let upvotedArticlesLoadPromise: Promise<UpvotedArticle[]> | null = null;

const loadUpvotedArticlesOnce = async () => {
  if (!upvotedArticlesLoadPromise) {
    upvotedArticlesLoadPromise = fetch('/api/user/upvoted-articles')
      .then(async (res) => {
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      })
      .catch(() => [])
      .finally(() => {
        upvotedArticlesLoadPromise = null;
      });
  }

  return upvotedArticlesLoadPromise;
};

export default function UpvotedPanel({ onClose }: { onClose?: () => void }) {
  const [upvotedArticles, setUpvotedArticles] = useState<UpvotedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingUnvote, setPendingUnvote] = useState<UpvotedArticle | null>(null);
  const [unvotingId, setUnvotingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const articles = await loadUpvotedArticlesOnce();
        if (!cancelled) {
          setUpvotedArticles(articles);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const confirmUnvote = async () => {
    if (!pendingUnvote) return;
    const id = pendingUnvote.id;
    setUnvotingId(id);
    try {
      await axios.post('/api/articles/upvote', { articleId: id });
      setUpvotedArticles(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      // ignore
    } finally {
      setUnvotingId(null);
      setPendingUnvote(null);
    }
  };

  return (
    <div className="space-y-3 py-3 px-4">
      <div className="pt-1">
        <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-300">Upvoted articles</h2>

        {loading ? (
          <p className="text-sm text-gray-500">Loading your upvoted articles...</p>
        ) : upvotedArticles.length === 0 ? (
          <p className="text-sm text-gray-500">No upvoted articles yet.</p>
        ) : (
          <ul className="space-y-2">
            {upvotedArticles.map(article => (
              <li key={article.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-950/60 px-2 py-1.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{article.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{article.journalName}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {article.link ? (
                    <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">Read</a>
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

      {/* Close button removed; clicking outside the dialog already dismisses it */}

      <AlertDialog open={!!pendingUnvote} onOpenChange={(open) => { if (!open) setPendingUnvote(null); }}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-300">Remove this article from your upvoted list?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">This will unvote the article and remove it from your saved upvoted articles section.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnvote} className="bg-red-600 text-white hover:bg-red-700">Remove vote</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
