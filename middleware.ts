import { withAuth } from 'next-auth/middleware';
import { authOptions } from '@/lib/auth';

export default withAuth(
  function middleware(req) {
    // Add any middleware logic here if needed
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
