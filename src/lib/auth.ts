// Re-export from the centralised auth config for backwards compatibility.
// next-auth v5 uses a single top-level auth.ts; keep this file so any
// existing imports from '@/lib/auth' continue to work.
export { handlers, auth, signIn, signOut } from '@/auth';
