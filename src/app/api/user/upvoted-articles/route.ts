import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserUpvotedArticles } from '@/lib/repositories';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await getUserUpvotedArticles(session.user.id, 20, session.user.email ?? undefined);
    return NextResponse.json(items.map(item => ({
      ...item,
      upvotedAt: item.upvotedAt?.toISOString() ?? null,
    })));
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch upvoted articles' }, { status: 500 });
  }
}
