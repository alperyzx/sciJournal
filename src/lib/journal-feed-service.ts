import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { stripHtml } from 'string-strip-html';

import { getCachedRssData, listVisibleJournals, setCachedRssData, type RssArticle, type RssArticleGroup } from '@/lib/repositories';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const MAX_ARTICLES = 12;

function extractDateFromHtml(htmlContent: string): string | null {
  const pubDateRegex = /<p>Publication date: ([^<]+)<\/p>/i;
  const match = htmlContent.match(pubDateRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return null;
}

async function fetchRegularFeed(feed: { journalName: string; url: string; type?: string }): Promise<RssArticleGroup> {
  try {
    const res = await axios.get(feed.url, {
      responseType: 'text',
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/xml, application/rss+xml, text/xml, */*',
      },
    });

    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
      attributeNamePrefix: '',
      isArray: (name) => name === 'item' || name === 'entry',
    });

    const jsonObj = parser.parse(res.data);
    let items = [];
    if (jsonObj.rss?.channel?.item) {
      items = Array.isArray(jsonObj.rss.channel.item) ? jsonObj.rss.channel.item : [jsonObj.rss.channel.item];
    } else if (jsonObj.feed?.entry) {
      items = Array.isArray(jsonObj.feed.entry) ? jsonObj.feed.entry : [jsonObj.feed.entry];
    } else if (jsonObj.RDF?.item) {
      items = Array.isArray(jsonObj.RDF.item) ? jsonObj.RDF.item : [jsonObj.RDF.item];
    }

    let articles = items.map((item: any): RssArticle => {
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

      let rawDescription = '';
      if (item.description) {
        rawDescription = typeof item.description === 'string' ? item.description : '';
      } else if (item.summary) {
        rawDescription = typeof item.summary === 'string' ? item.summary : '';
      } else if (item.content) {
        rawDescription = typeof item.content === 'string' ? item.content : (item.content._ ? item.content._ : '');
      }

      const description = stripHtml(rawDescription).result;

      let pubDate = '';
      if (feed.type === 'sciencedirect') {
        const dateFromHtml = extractDateFromHtml(rawDescription);
        if (dateFromHtml) {
          pubDate = dateFromHtml;
        }

        if (!pubDate) {
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

      if (!pubDate) {
        pubDate = new Date().toISOString();
      }

      return {
        title: item.title || 'No Title',
        link,
        description,
        publicationDate: pubDate,
      };
    });

    articles = articles
      .sort((a: RssArticle, b: RssArticle) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime())
      .slice(0, MAX_ARTICLES);

    return { journalName: feed.journalName, articles };
  } catch (error) {
    return { journalName: feed.journalName, articles: [] };
  }
}

export async function getVisibleJournalArticleGroups(force = false): Promise<RssArticleGroup[]> {
  if (!force) {
    const cachedData = getCachedRssData();
    if (cachedData) {
      return cachedData;
    }
  }

  const feedSources = await listVisibleJournals();
  if (feedSources.length === 0) {
    return [];
  }

  const results: RssArticleGroup[] = [];
  for (const feed of feedSources) {
    results.push(await fetchRegularFeed(feed));
    await delay(500);
  }

  const nonEmptyGroups = results.filter(group => group.articles.length > 0);
  const finalResults = nonEmptyGroups.length > 0 ? nonEmptyGroups : results;
  setCachedRssData(finalResults);
  return finalResults;
}
