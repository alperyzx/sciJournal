'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPanel() {
  return (
    <div className="w-full max-w-lg">
      <Card className="bg-white/95 dark:bg-gray-900/95 border-gray-200/70 dark:border-gray-700/70 shadow-xl backdrop-blur-sm overflow-hidden">
        <CardHeader className="text-center space-y-2 p-6">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">Terms of Service</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">These Terms govern your use of SciJournal Digest.</p>
        </CardHeader>
        <CardContent className="space-y-3 p-6 pt-0 text-sm text-gray-700 dark:text-gray-300">
          <h3 className="font-semibold">Acceptance</h3>
          <p>By using the service you agree to these terms.</p>
          <h3 className="font-semibold">Use of Service</h3>
          <p>Users must comply with applicable laws and not misuse the service.</p>
        </CardContent>
      </Card>
    </div>
  );
}
