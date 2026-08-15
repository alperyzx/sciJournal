import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findOrCreateArticle, toggleVote } from '@/lib/repositories';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

const UPVOTE_RATE_LIMIT = 6;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(`upvote:${getClientIp(request.headers)}`, UPVOTE_RATE_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json({ message: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rateLimit) });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401, headers: rateLimitHeaders(rateLimit) });

  const body = await request.json();
  const { journalName, title, publicationDate, link, description, articleId } = body;

  // If articleId provided, toggle directly; otherwise findOrCreate
  let artId = articleId;
  if (!artId) {
    if (!journalName || !title || !publicationDate) {
      return NextResponse.json({ message: 'Missing article identity' }, { status: 400, headers: rateLimitHeaders(rateLimit) });
    }
    const art = await findOrCreateArticle({ journalName, title, publicationDate, link, description });
    artId = art._id?.toString();
  }

  if (!artId) return NextResponse.json({ message: 'Failed to resolve article' }, { status: 500, headers: rateLimitHeaders(rateLimit) });

  const result = await toggleVote(session.user.id, artId, session.user.email);
  return NextResponse.json({ ...result, articleId: artId }, { headers: rateLimitHeaders(rateLimit) });
}
