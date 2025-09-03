import { NextRequest, NextResponse } from 'next/server';
import { fetchAndParseRssFeed, Article } from '@/services/rss-parser';

// Test RSS feed endpoint
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { message: 'URL is required' },
        { status: 400 }
      );
    }

    // Test the feed
    const articles = await fetchAndParseRssFeed(url, 'Test Feed');
    
    return NextResponse.json({
      success: true,
      articleCount: articles.length,
      message: `Successfully parsed RSS feed with ${articles.length} articles`,
      sampleTitles: articles.slice(0, 3).map((article: Article) => article.title)
    });
  } catch (error) {
    console.error('Feed test error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to parse RSS feed'
      },
      { status: 400 }
    );
  }
}
