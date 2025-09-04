import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import defaultFeeds from '../../rss/feeds';

const FEEDS_FILE_PATH = path.join(process.cwd(), 'src', 'app', 'api', 'rss', 'feeds.ts');

interface Journal {
  journalName: string;
  url: string;
  type: 'standard' | 'sciencedirect';
}

// Helper function to read the current feeds
async function readFeeds(): Promise<Journal[]> {
  try {
    // First try to import directly
    return defaultFeeds as Journal[];
  } catch (error) {
    console.error('Error reading feeds from import, trying file read:', error);
    try {
      const feedsContent = fs.readFileSync(FEEDS_FILE_PATH, 'utf-8');
      console.log('Feeds file content:', feedsContent.substring(0, 200));
      
      // Extract the feeds array from the TypeScript file
      const feedsMatch = feedsContent.match(/const feeds = (\[[\s\S]*?\]);/);
      console.log('Feeds match:', feedsMatch);
      
      if (feedsMatch) {
        // Convert TypeScript array to JSON and parse
        const feedsArrayStr = feedsMatch[1]
          .replace(/'/g, '"')
          .replace(/(\w+):/g, '"$1":')
          .replace(/,\s*\}/g, '}')
          .replace(/,\s*\]/g, ']');
        
        console.log('Processed array string:', feedsArrayStr.substring(0, 200));
        return JSON.parse(feedsArrayStr);
      }
      return [];
    } catch (fileError) {
      console.error('Error reading feeds from file:', fileError);
      return [];
    }
  }
}

// Helper function to write feeds back to the file
async function writeFeeds(feeds: Journal[]): Promise<void> {
  const feedsContent = `// This file is auto-generated for sharing feeds between API and frontend
const feeds = ${JSON.stringify(feeds, null, 2).replace(/"/g, "'")};
export default feeds;
`;

  fs.writeFileSync(FEEDS_FILE_PATH, feedsContent);
}

// GET - Fetch all journals
export async function GET() {
  try {
    const feeds = await readFeeds();
    return NextResponse.json(feeds);
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
    const newJournal: Journal = await request.json();
    
    // Validate input
    if (!newJournal.journalName || !newJournal.url) {
      return NextResponse.json(
        { message: 'Journal name and URL are required' },
        { status: 400 }
      );
    }

    const feeds = await readFeeds();
    
    // Check if journal already exists
    const existingJournal = feeds.find(feed => 
      feed.journalName.toLowerCase() === newJournal.journalName.toLowerCase()
    );
    
    if (existingJournal) {
      return NextResponse.json(
        { message: 'Journal with this name already exists' },
        { status: 409 }
      );
    }

    // Add new journal
    feeds.push(newJournal);
    await writeFeeds(feeds);

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
    const updatedJournal: Journal = await request.json();
    
    // Validate input
    if (!updatedJournal.journalName || !updatedJournal.url) {
      return NextResponse.json(
        { message: 'Journal name and URL are required' },
        { status: 400 }
      );
    }

    const feeds = await readFeeds();
    const journalIndex = feeds.findIndex(feed => 
      feed.journalName === updatedJournal.journalName
    );

    if (journalIndex === -1) {
      return NextResponse.json(
        { message: 'Journal not found' },
        { status: 404 }
      );
    }

    // Update journal
    feeds[journalIndex] = updatedJournal;
    await writeFeeds(feeds);

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
    const { journalName } = await request.json();
    
    if (!journalName) {
      return NextResponse.json(
        { message: 'Journal name is required' },
        { status: 400 }
      );
    }

    const feeds = await readFeeds();
    const filteredFeeds = feeds.filter(feed => feed.journalName !== journalName);

    if (feeds.length === filteredFeeds.length) {
      return NextResponse.json(
        { message: 'Journal not found' },
        { status: 404 }
      );
    }

    await writeFeeds(filteredFeeds);

    return NextResponse.json({ message: 'Journal deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete journal' },
      { status: 500 }
    );
  }
}
