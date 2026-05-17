'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPanel() {
  return (
    <div className="w-full max-w-lg">
      <Card className="bg-white/95 dark:bg-gray-900/95 border-gray-200/70 dark:border-gray-700/70 shadow-xl backdrop-blur-sm overflow-hidden">
        <CardHeader className="text-center space-y-2 p-6">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">Privacy Policy</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">This is the public privacy policy for SciJournal Digest.</p>
        </CardHeader>
        <CardContent className="space-y-3 p-6 pt-0 text-sm text-gray-700 dark:text-gray-300">
          <h3 className="font-semibold">Information We Collect</h3>
          <p>We collect only the information necessary to provide the service, including authentication details and user preferences.</p>
          <h3 className="font-semibold">How We Use Data</h3>
          <p>We use collected data to personalize your feed and to enable account functionality.</p>
        </CardContent>
      </Card>
    </div>
  );
}
