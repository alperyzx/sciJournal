import { NextResponse } from 'next/server';
import { listVisibleJournals } from '@/lib/repositories';
import { getVisibleJournalArticleGroups } from '@/lib/journal-feed-service';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

const JOURNAL_RESPONSE_CACHE_CONTROL = 'public, max-age=60, s-maxage=60, stale-while-revalidate=300';
const JOURNAL_RATE_LIMIT_WINDOW_MS = 60_000;
const JOURNALS_RATE_LIMIT = 20;
const JOURNALS_WITH_ARTICLES_RATE_LIMIT = 30;

function serializeJournal(journal: { journalName: string; url: string; type: string; order?: number; homeVisible?: boolean }) {
  return {
    journalName: journal.journalName,
    url: journal.url,
    type: journal.type,
    order: journal.order,
    homeVisible: journal.homeVisible,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeArticles = url.searchParams.get('includeArticles') === 'true';
    const rateLimit = checkRateLimit(
      `journals:${includeArticles ? 'with-articles' : 'metadata'}:${getClientIp(request.headers)}`,
      includeArticles ? JOURNALS_WITH_ARTICLES_RATE_LIMIT : JOURNALS_RATE_LIMIT,
      JOURNAL_RATE_LIMIT_WINDOW_MS
    );

    if (!rateLimit.allowed) {
      return NextResponse.json({ message: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rateLimit) });
    }

    const journals = await listVisibleJournals();
    if (!includeArticles) {
      return NextResponse.json(journals.map(serializeJournal), {
        headers: { 'Cache-Control': JOURNAL_RESPONSE_CACHE_CONTROL, ...rateLimitHeaders(rateLimit) },
      });
    }

    const articles = await getVisibleJournalArticleGroups();
    return NextResponse.json(
      {
        journals: journals.map(serializeJournal),
        articles,
      },
      {
        headers: { 'Cache-Control': JOURNAL_RESPONSE_CACHE_CONTROL, ...rateLimitHeaders(rateLimit) },
      }
    );
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch journals' }, { status: 500 });
  }
}
