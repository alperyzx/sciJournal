import { NextRequest, NextResponse } from 'next/server';
import { defaultJournals } from '@/lib/default-journals';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createJournal, deleteJournal, listJournals, seedJournalsIfEmpty, updateJournal, type JournalInput } from '@/lib/repositories';
import { parseAndValidateFeedUrl } from '@/services/safe-rss-fetch';

type Journal = JournalInput;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }

  return session;
}

function serializeJournal(journal: Journal) {
  return {
    journalName: journal.journalName,
    url: journal.url,
    type: journal.type,
    order: journal.order,
    homeVisible: journal.homeVisible,
  };
}

function validateJournalFeedUrl(url: unknown): { url?: string; error?: string } {
  if (typeof url !== 'string') return { error: 'Journal URL is required.' };

  try {
    return { url: parseAndValidateFeedUrl(url).toString() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Journal URL is invalid.' };
  }
}

// GET - Fetch all journals
export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const feeds = await seedJournalsIfEmpty(defaultJournals as Journal[]);
    return NextResponse.json(feeds.map(serializeJournal));
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch journals' },
      { status: 500 }
    );
  }
}

// POST - Add new journal
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const newJournal: Journal = await request.json();
    
    // Validate input
    if (!newJournal.journalName || !newJournal.url) {
      return NextResponse.json(
        { message: 'Journal name and URL are required' },
        { status: 400 }
      );
    }

    const validation = validateJournalFeedUrl(newJournal.url);
    if (validation.error) return NextResponse.json({ message: validation.error }, { status: 400 });
    newJournal.url = validation.url!;

    const feeds = await listJournals();
    if (feeds.some(feed => feed.journalName.toLowerCase() === newJournal.journalName.toLowerCase())) {
      return NextResponse.json(
        { message: 'Journal with this name already exists' },
        { status: 409 }
      );
    }

    await createJournal(newJournal);

    return NextResponse.json({ message: 'Journal added successfully' });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to add journal' },
      { status: 500 }
    );
  }
}

// PUT - Update existing journal
export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const updatedJournal: Journal = await request.json();
    
    // Validate input
    if (!updatedJournal.journalName || !updatedJournal.url) {
      return NextResponse.json(
        { message: 'Journal name and URL are required' },
        { status: 400 }
      );
    }

    const validation = validateJournalFeedUrl(updatedJournal.url);
    if (validation.error) return NextResponse.json({ message: validation.error }, { status: 400 });
    updatedJournal.url = validation.url!;

    const savedJournal = await updateJournal(updatedJournal);

    if (!savedJournal) {
      return NextResponse.json(
        { message: 'Journal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Journal updated successfully' });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update journal' },
      { status: 500 }
    );
  }
}

// DELETE - Remove journal
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { journalName } = await request.json();
    
    if (!journalName) {
      return NextResponse.json(
        { message: 'Journal name is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteJournal(journalName);

    if (!deleted) {
      return NextResponse.json(
        { message: 'Journal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Journal deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete journal' },
      { status: 500 }
    );
  }
}
