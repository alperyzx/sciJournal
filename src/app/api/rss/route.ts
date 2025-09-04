import axios from 'axios';
import { NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';
import { stripHtml } from 'string-strip-html';

// Define feed sources (imported from shared file)
import feeds from './feeds';

interface Article {
  title: string;
  link: string;
  description: string;
  publicationDate: string;
}

interface ArticleGroup {
  journalName: string;
  articles: Article[];
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_ARTICLES = 12;

// Cache configuration
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// In-memory cache
interface CacheEntry {
  data: ArticleGroup[];
  timestamp: number;
}

let cache: CacheEntry | null = null;

// Function to check if cache is valid
function isCacheValid(): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_TTL;
}

// Function to get cached data
function getCachedData(): ArticleGroup[] | null {
  if (isCacheValid()) {
    console.log('Returning cached RSS data');
    return cache!.data;
  }
  return null;
}

// Function to set cache
function setCacheData(data: ArticleGroup[]): void {
  cache = {
    data,
    timestamp: Date.now()
  };
  console.log('RSS data cached for 1 hour');
}

// Function to extract date from HTML content with publication date tag
function extractDateFromHtml(htmlContent: string): string | null {
  // Look for patterns like <p>Publication date: March 2025</p>
  const pubDateRegex = /<p>Publication date: ([^<]+)<\/p>/i;
  const match = htmlContent.match(pubDateRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return null;
}

export async function GET() {
  try {
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    console.log('Cache miss or expired, fetching fresh RSS data');
    const results: ArticleGroup[] = [];

    // Process feeds sequentially to avoid rate limiting
    for (const feed of feeds) {
      try {
        console.log(`Fetching feed: ${feed.journalName}`);
        // Use fetchRegularFeed for all feed types since rss2json is failing
        const articleGroup = await fetchRegularFeed(feed);
        results.push(articleGroup);

        // Add delay between requests
        await delay(500);
      } catch (error) {
        console.error(`Error fetching ${feed.journalName}:`, error);
        // Add empty result if fetch fails
        results.push({ journalName: feed.journalName, articles: [] });
      }
    }

    // Filter out journals with empty articles (optional)
    const nonEmptyGroups = results.filter(group => group.articles.length > 0);
    const finalResults = nonEmptyGroups.length > 0 ? nonEmptyGroups : results;
    
    // Cache the results
    setCacheData(finalResults);

    return NextResponse.json(finalResults);
  } catch (error) {
    console.error("Error in RSS handler:", error);
    return NextResponse.json({ error: "Failed to fetch RSS feeds" }, { status: 500 });
  }
}

async function fetchRegularFeed(feed: { journalName: string; url: string; type?: string }): Promise<ArticleGroup> {
  try {
    const res = await axios.get(feed.url, {
      responseType: 'text',
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/xml, application/rss+xml, text/xml, */*'
      },
    });

    const xmlData = res.data;

    // Create a new parser with configurations
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      attributeNamePrefix: "",
      isArray: (name) => name === 'item' || name === 'entry'
    });

    // Parse XML data
    const jsonObj = parser.parse(xmlData);

    // Handle different RSS formats
    let items = [];
    if (jsonObj.rss?.channel?.item) {
      items = Array.isArray(jsonObj.rss.channel.item) ? jsonObj.rss.channel.item : [jsonObj.rss.channel.item];
    } else if (jsonObj.feed?.entry) {
      items = Array.isArray(jsonObj.feed.entry) ? jsonObj.feed.entry : [jsonObj.feed.entry];
    } else if (jsonObj.RDF?.item) {
      items = Array.isArray(jsonObj.RDF.item) ? jsonObj.RDF.item : [jsonObj.RDF.item];
    }

    let articles = items.map((item: any) => {
      // Extract link - handles different RSS formats
      let link = '';
      if (typeof item.link === 'string') {
        link = item.link;
      } else if (item.link && item.link.href) {
        link = item.link.href;
      } else if (item.guid && typeof item.guid === 'string') {
        link = item.guid;
      } else if (item.id && typeof item.id === 'string') {
        link = item.id;
      }

      // Extract description - handles different formats
      let description = '';
      let rawDescription = '';
      if (item.description) {
        rawDescription = typeof item.description === 'string' ? item.description : '';
      } else if (item.summary) {
        rawDescription = typeof item.summary === 'string' ? item.summary : '';
      } else if (item.content) {
        rawDescription = typeof item.content === 'string' ? item.content :
                     (item.content._ ? item.content._ : '');
      }
      description = stripHtml(rawDescription).result;

      // Extract date - handles different formats with special case for ScienceDirect
      let pubDate = '';
      
      // For ScienceDirect, first try to extract from HTML content
      if (feed.type === 'sciencedirect') {
        // Try to extract from HTML content first
        const dateFromHtml = extractDateFromHtml(rawDescription);
        if (dateFromHtml) {
          pubDate = dateFromHtml;
          console.log(`Found date in HTML content: ${pubDate} for article: ${item.title || 'Untitled'}`);
        }
        
        // If we couldn't extract from HTML, try the standard fields
        if (!pubDate) {
          // Keep the existing checks
          if (item['prism:coverDate']) {
            pubDate = item['prism:coverDate'];
          } else if (item['dc:date']) {
            pubDate = item['dc:date'];
          } else if (item['prism:publicationDate']) {
            pubDate = item['prism:publicationDate'];
          } else if (item.date) {
            pubDate = item.date;
          }
        }
      } else {
        // Standard date handling for other feed types
        if (item.pubDate) {
          pubDate = item.pubDate;
        } else if (item.date) {
          pubDate = item.date;
        } else if (item.published) {
          pubDate = item.published;
        } else if (item.updated) {
          pubDate = item.updated;
        }
      }
      
      // If no date found, use current date as fallback
      if (!pubDate) {
        console.log(`No date found for article: ${item.title || 'Untitled'}, defaulting to current date`);
        pubDate = new Date().toISOString();
      }

      return {
        title: item.title || 'No Title',
        link: link,
        description: description,
        publicationDate: pubDate,
      };
    });

    articles = articles
      .sort((a: Article, b: Article) => {
        // Special handling for dates like "March 2025"
        // which can't be directly compared with new Date()
        try {
          return new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime();
        } catch (err) {
          // If date comparison fails, keep original order
          return 0;
        }
      })
      .slice(0, MAX_ARTICLES);

    console.log(`Successfully fetched ${articles.length} articles from ${feed.journalName}`);
    return { journalName: feed.journalName, articles };
  } catch (error: any) {
    console.error(`Failed to fetch articles from ${feed.journalName}:`, error.message);
    return { journalName: feed.journalName, articles: [] };
  }
}
