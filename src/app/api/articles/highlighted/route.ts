import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTopHighlighted } from '@/lib/repositories';
import { getUserVotesForArticleIds } from '@/lib/repositories';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

const HIGHLIGHT_RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  try {
    const rateLimit = checkRateLimit(`highlighted:${getClientIp(request.headers)}`, HIGHLIGHT_RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
    if (!rateLimit.allowed) {
      return NextResponse.json({ message: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rateLimit) });
    }

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
      }),
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (e) {
    return NextResponse.json({ message: 'Failed' }, { status: 500 });
  }
}
