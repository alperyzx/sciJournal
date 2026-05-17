'use client';

import { SessionProvider, useSession } from 'next-auth/react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}

