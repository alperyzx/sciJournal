"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen modern-bg text-scijournal-text flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-[999] bg-white/90 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 text-center relative">
          <Link href="/" className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400 dark:from-blue-400 dark:to-teal-300">SciJournal Digest</Link>
          <Link href="/" aria-label="Back to home" title="Back" className="gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground py-2 flex h-10 w-10 items-center justify-center px-0 sm:w-auto sm:px-4 absolute right-3 top-1/2 transform -translate-y-1/2">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow pt-24 px-4 pb-12 bg-gradient-to-br from-slate-50 via-white to-cyan-50 text-foreground dark:from-gray-950 dark:via-slate-950 dark:to-gray-900">
        <div className="w-full max-w-3xl mx-auto bg-white/95 dark:bg-gray-900/95 p-8 rounded-2xl shadow-lg border border-gray-200/70 dark:border-gray-700/70 backdrop-blur-sm">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-300">Terms of Service</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">These Terms of Service govern your use of SciJournal Digest.</p>
          <section className="prose max-w-none text-sm text-gray-700 dark:text-gray-300">
            <h2>Acceptance</h2>
            <p>By using the service you agree to these terms.</p>
            <h2>Use of Service</h2>
            <p>Users must comply with applicable laws and not misuse the service.</p>
            <h2>Limitations</h2>
            <p>ScienceJournal Digest provides aggregated content for informational purposes only.</p>
          </section>
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
