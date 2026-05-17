'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfilePanel from '@/components/ProfilePanel';

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  return (
    <div className="min-h-screen modern-bg text-scijournal-text flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-[999] bg-white/90 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 text-center">
          <Link href="/" className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400 dark:from-blue-400 dark:to-teal-300">SciJournal Digest</Link>
        </div>
      </header>

      <main className="flex-grow pt-24 px-4 pb-12 bg-gradient-to-br from-slate-50 via-white to-cyan-50 text-foreground dark:from-gray-950 dark:via-slate-950 dark:to-gray-900">
        <div className="w-full max-w-[95vw] sm:max-w-3xl mx-auto">
          <ProfilePanel />
        </div>
      </main>

      <footer className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 mt-6 sm:mt-8">
        <div className="container mx-auto px-3 sm:px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400 dark:from-blue-400 dark:to-teal-300 font-semibold">SciJournal Digest</span>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-gray-500 dark:text-gray-400">© 2025</span>
              <a href="https://github.com/alperyzx/sciJournal" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a>
              <a href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy</a>
              <a href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

