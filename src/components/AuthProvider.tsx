'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

function OnboardingRedirector() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) return;

    const onboardingComplete = (session.user as any).onboardingComplete;

    // Don't redirect when already on onboarding, login, or admin
    if (!onboardingComplete && pathname !== '/onboarding' && pathname !== '/login' && !pathname.startsWith('/admin')) {
      router.push('/onboarding');
    }
  }, [status, session, pathname, router]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <OnboardingRedirector />
    </SessionProvider>
  );
}

