'use client';

import React from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-white to-cyan-50 text-foreground dark:from-gray-950 dark:via-slate-950 dark:to-gray-900">
      <div className="w-full max-w-md">
        <Card className="bg-white/95 dark:bg-gray-900/95 border-gray-200/70 dark:border-gray-700/70 shadow-2xl backdrop-blur-sm overflow-hidden">
          <CardHeader className="text-center space-y-3 pb-4">
            <CardTitle className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              SciJournal Digest
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sign in to personalize your feed and continue to your profile.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => signIn('google', { callbackUrl: '/profile' })}
              className="w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            <Button
              onClick={() => signIn('github', { callbackUrl: '/profile' })}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.48 0-.24-.01-1.03-.01-1.87-2.78.63-3.37-1.22-3.37-1.22-.45-1.18-1.11-1.49-1.11-1.49-.91-.63.07-.62.07-.62 1.01.07 1.54 1.06 1.54 1.06.9 1.58 2.37 1.12 2.95.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05A9.33 9.33 0 0 1 12 6.82c.85 0 1.71.12 2.51.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.67.96.67 1.94 0 1.4-.01 2.53-.01 2.87 0 .26.18.59.69.48A10.01 10.01 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
              </svg>
              Continue with GitHub
            </Button>
            <Alert className="border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
              <AlertDescription>
                Your account will be created automatically on first sign in.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
