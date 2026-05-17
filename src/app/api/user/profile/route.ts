import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAuthUser, getAuthUserById, updateAuthUserProfile, updateAuthUserProfileById } from '@/lib/repositories';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user.id ? await getAuthUserById(session.user.id) : await getAuthUser(session.user.email);
  if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  return NextResponse.json({ email: user.email, name: user.name, selectedJournals: user.selectedJournals ?? [] });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, selectedJournals } = body;

  if (typeof name !== 'string' || !Array.isArray(selectedJournals)) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const updated = session.user.id
    ? await updateAuthUserProfileById(session.user.id, { name, selectedJournals })
    : await updateAuthUserProfile(session.user.email, { name, selectedJournals });
  if (!updated) return NextResponse.json({ message: 'Failed to update' }, { status: 500 });

  return NextResponse.json({ success: true });
}
