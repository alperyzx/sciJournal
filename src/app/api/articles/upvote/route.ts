import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findOrCreateArticle, toggleVote } from '@/lib/repositories';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { journalName, title, publicationDate, link, description, articleId } = body;

  // If articleId provided, toggle directly; otherwise findOrCreate
  let artId = articleId;
  if (!artId) {
    if (!journalName || !title || !publicationDate) {
      return NextResponse.json({ message: 'Missing article identity' }, { status: 400 });
    }
    const art = await findOrCreateArticle({ journalName, title, publicationDate, link, description });
    artId = art._id?.toString();
  }

  if (!artId) return NextResponse.json({ message: 'Failed to resolve article' }, { status: 500 });

  const result = await toggleVote(session.user.id, artId, session.user.email);
  return NextResponse.json({ ...result, articleId: artId });
}
