
import Parser from 'rss-parser';

/**
 * Represents an RSS Feed Item.
 */
export interface Article {
  /**
   * The title of the RSS item.
   */
  title: string;
  /**
   * The link to the RSS item.
   */
  link: string;
  /**
   * The publication date of the RSS item.
   */
  publicationDate: Date;
  /**
   * The description of the RSS item.
   */
  description: string;
}

/**
 * Represents an RSS Feed.
 */
export interface RssFeed {
  /**
   * The title of the RSS feed.
   */
  title: string;
  /**
   * The link to the RSS feed.
   */
  link: string;
  /**
   * The description of the RSS feed.
   */
  description: string;
  /**
   * The list of items in the RSS feed.
   */
  items: Article[];
}

/**
 * Asynchronously retrieves and parses an RSS feed from a given URL.
 *
 * @param feedUrl The URL of the RSS feed to retrieve.
 * @returns A promise that resolves to an RssFeed object.
 */
export async function fetchAndParseRssFeed(feedUrl: string, journalName: string): Promise<Article[]> {
  try {
    const parser = new Parser();
    const response = await fetch(feedUrl, {
      headers: {
        'user-agent': 'SciJournal Digest',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }

    const feedXml = await response.text();
    const feed = await parser.parseString(feedXml);

    return feed.items.map(item => ({
      title: item.title || 'No Title',
      link: item.link || '',
      publicationDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      description: item.contentSnippet || item.description || 'No Description',
    }));
  } catch (error) {
    console.error(`Error fetching or parsing RSS feed from ${journalName}:`, error);
    return [];
  }
}
