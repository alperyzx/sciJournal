import { NextResponse } from 'next/server';
import { listVisibleJournals } from '@/lib/repositories';
import { getVisibleJournalArticleGroups } from '@/lib/journal-feed-service';

const JOURNAL_RESPONSE_CACHE_CONTROL = 'public, max-age=60, s-maxage=60, stale-while-revalidate=300';

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

    const journals = await listVisibleJournals();
    if (!includeArticles) {
      return NextResponse.json(journals.map(serializeJournal), {
        headers: { 'Cache-Control': JOURNAL_RESPONSE_CACHE_CONTROL },
      });
    }

    const articles = await getVisibleJournalArticleGroups();
    return NextResponse.json(
      {
        journals: journals.map(serializeJournal),
        articles,
      },
      {
        headers: { 'Cache-Control': JOURNAL_RESPONSE_CACHE_CONTROL },
      }
    );
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch journals' }, { status: 500 });
  }
}
