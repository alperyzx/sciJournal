import React from 'react';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-white to-cyan-50 text-foreground dark:from-gray-950 dark:via-slate-950 dark:to-gray-900">
      <div className="w-full max-w-3xl bg-white/95 dark:bg-gray-900/95 p-8 rounded-2xl shadow-lg border border-gray-200/70 dark:border-gray-700/70 backdrop-blur-sm">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Terms of Service</h1>
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
    </div>
  );
}
