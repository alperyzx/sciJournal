import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTopHighlighted } from '@/lib/repositories';
import { getUserVotesForArticleIds } from '@/lib/repositories';

export async function GET() {
  try {
    const items = await getTopHighlighted(6);
    const session = await getServerSession(authOptions);
    const articleIds = items.map(i => i._id?.toString()).filter(Boolean) as string[];
    const votedIds = session?.user?.id
      ? await getUserVotesForArticleIds(session.user.id, articleIds, session.user.email ?? undefined)
      : new Set<string>();

    return NextResponse.json(
      items.map(i => {
        const id = i._id?.toString();
        return {
          id,
          journalName: i.journalName,
          title: i.title,
          link: i.link,
          description: i.description,
          publicationDate: i.publicationDate,
          votes: i.voteCount ?? 0,
          upvoted: id ? votedIds.has(id) : false,
        };
      })
    );
  } catch (e) {
    return NextResponse.json({ message: 'Failed' }, { status: 500 });
  }
}
