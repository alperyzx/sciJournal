import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-white to-cyan-50 text-foreground dark:from-gray-950 dark:via-slate-950 dark:to-gray-900">
      <div className="w-full max-w-3xl bg-white/95 dark:bg-gray-900/95 p-8 rounded-2xl shadow-lg border border-gray-200/70 dark:border-gray-700/70 backdrop-blur-sm">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Privacy Policy</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">This is the public privacy policy for SciJournal Digest. It explains what information we collect, how we use it, and your choices.</p>
        <section className="prose max-w-none text-sm text-gray-700 dark:text-gray-300">
          <h2>Information We Collect</h2>
          <p>We collect only the information necessary to provide the service, including authentication details and user preferences.</p>
          <h2>How We Use Data</h2>
          <p>We use collected data to personalize your feed and to enable account functionality.</p>
          <h2>Contact</h2>
          <p>For privacy-related questions, contact the site administrator at the address listed in the README.</p>
        </section>
      </div>
    </div>
  );
}
