import { NextResponse } from 'next/server';
import { listVisibleJournals } from '@/lib/repositories';

export async function GET() {
  try {
    const journals = await listVisibleJournals();
    return NextResponse.json(journals.map(j => ({ journalName: j.journalName, url: j.url, type: j.type, order: j.order, homeVisible: j.homeVisible })));
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch journals' }, { status: 500 });
  }
}
