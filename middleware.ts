import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth(function middleware(req) {
  const { nextUrl, auth: session } = req as NextRequest & { auth: unknown };

  // Only protect /admin routes
  if (nextUrl.pathname.startsWith('/admin') && !session) {
    const signInUrl = new URL('/api/auth/signin', nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*'],
};
