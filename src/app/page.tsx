'use client';

import {useEffect, useState, useRef} from 'react';
import axios from 'axios';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {Search, Calendar, ExternalLink} from 'lucide-react';
import FloatingTriangles from '@/components/FloatingTriangles';
import HeaderParticles from '@/components/HeaderParticles';

// Get journal list from API route feeds (imported dynamically)
import feeds from './api/rss/feeds';
const JOURNALS = feeds.map((f: { journalName: string }) => f.journalName);

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

const ARTICLES_PER_PAGE = 6;

const Home: React.FC = () => {
  // Per-journal state
  const [articles, setArticles] = useState<{ [journal: string]: Article[] }>({});
  const [loading, setLoading] = useState<{ [journal: string]: boolean }>({});
  const [error, setError] = useState<{ [journal: string]: string | null }>({});
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<string | null>(null);
  const headerHeight = 160; // px, increased for search bar in header

  // Night mode: set dark class based on system preference
  useEffect(() => {
    const html = document.documentElement;
    const setDarkMode = (e?: MediaQueryListEvent) => {
      const isDark = e ? e.matches : window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    };
    setDarkMode();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', setDarkMode);
    return () => mq.removeEventListener('change', setDarkMode);
  }, []);

  // Global loading state for all journals
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Fetch all articles for all journals on mount
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setGlobalLoading(true);
      setGlobalError(null);
      try {
        const response = await axios.get('/api/rss');
        const groups: ArticleGroup[] = response.data;
        const articlesMap: { [journal: string]: Article[] } = {};
        groups.forEach(group => {
          articlesMap[group.journalName] = group.articles;
        });
        if (!cancelled) {
          setArticles(articlesMap);
        }
      } catch (err) {
        if (!cancelled) {
          setGlobalError('Failed to fetch articles. Please try again later.');
        }
      } finally {
        if (!cancelled) {
          setGlobalLoading(false);
        }
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // Filtered articles based on search
  const getFilteredArticles = (journalArticles: Article[], journalName: string) => {
    if (!searchQuery.trim()) return journalArticles;
    const query = searchQuery.toLowerCase().trim();
    return journalArticles.filter(article =>
      article.title.toLowerCase().includes(query) ||
      article.description.toLowerCase().includes(query) ||
      journalName.toLowerCase().includes(query) // Also search in journal name
    );
  };

  // Get all articles for global search
  const getAllArticles = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    const allArticles: (Article & { journalName: string })[] = [];

    JOURNALS.forEach(journalName => {
      const journalArticles = articles[journalName] || [];
      journalArticles.forEach(article => {
        // Handle title and description as string or array
        const title = Array.isArray(article.title) ? article.title[0] : article.title;
        const description = Array.isArray(article.description) ? article.description[0] : article.description;
        
        if (
          title?.toLowerCase().includes(query) ||
          description?.toLowerCase().includes(query) ||
          journalName.toLowerCase().includes(query)
        ) {
          allArticles.push({ ...article, journalName });
        }
      });
    });

    return allArticles.slice(0, 18); // Show max 18 results in global search
  };

  // Highlight search terms in text
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-1 rounded">
          {part}
        </span>
      ) : part
    );
  };

  // Helper function to format date consistently
  const formatDate = (dateString: string): string => {
    try {
      // Check if the dateString is already in a readable format like "March 2025"
      if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i.test(dateString)) {
        return dateString;
      }
      
      // Try to parse as a standard date
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
      
      // If we couldn't parse it, return as-is
      return dateString;
    } catch (e) {
      return dateString || 'Unknown date';
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 5);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen modern-bg text-scijournal-text flex flex-col">
      {/* Fixed Header */}
      <div className={
        `fixed top-0 left-0 right-0 z-[9999] bg-white/90 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-blue-900 shadow-sm overflow-hidden transition-[padding] duration-700 md:duration-600 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]${isScrolled ? ' py-0' : ''}`
      }>
        {/* Header particles animation */}
        <HeaderParticles />
        <div className={`container mx-auto px-4 ${isScrolled ? 'py-2 md:py-2' : 'py-5 md:py-7'} relative z-20 pointer-events-none transition-[padding] duration-700 md:duration-600 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]`}>
          {/* Title Row */}
          <div className="flex items-center justify-center gap-2 md:gap-4 pointer-events-auto mb-4">
            {/* Updated stylish title */}
            <div className="relative">
              <h1 className={`${isScrolled ? 'text-xl md:text-2xl lg:text-3xl' : 'text-2xl md:text-3xl lg:text-4xl'} font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-700 via-cyan-400 to-teal-400 dark:from-blue-400 dark:via-cyan-300 dark:to-teal-200 tracking-wide md:tracking-widest whitespace-nowrap transition-all duration-700 md:duration-600 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]`}>
                SciJournal Digest
              </h1>
              <svg className="absolute -bottom-0.5 md:-bottom-1 left-1/2 transform -translate-x-1/2" width="80" height="10" viewBox="0 0 80 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(80px, 100%, 120px)', height: 'clamp(8px, 1.5vw, 15px)' }}>
                <path d="M0 5 Q40 0 80 5" stroke="url(#gradient)" strokeWidth="1.5" fill="none"/>
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="80" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" className="dark:stop-color-[#60a5fa]"/>
                    <stop offset="100%" stopColor="#14b8a6" className="dark:stop-color-[#2dd4bf]"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          
          {/* Search Row */}
          <div className="flex justify-center pointer-events-auto">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 py-3 w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-full text-lg shadow-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {searchQuery && (
            <div className="text-center mt-2 pointer-events-auto">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Press Enter or click on articles to search
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Floating triangles */}
      <FloatingTriangles />

      {/* Main Content with top padding to account for fixed header */}
      <div className={`container mx-auto px-4 py-6 relative z-10 ${isScrolled ? 'pt-20 md:pt-22 lg:pt-24' : 'pt-32 md:pt-36 lg:pt-40'} flex-grow transition-[padding] duration-700 md:duration-600 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]`} style={{ scrollPaddingBottom: `${headerHeight + 40}px` }}>

        {globalError && (
          <div className="text-center text-red-500 p-6 rounded-xl bg-red-50 border border-red-200 mb-8">
            <div className="text-2xl mb-2">⚠️</div>
            {globalError}
          </div>
        )}

        {/* Search Results or Journals Grid */}
        {searchQuery.trim() ? (
          /* Global Search Results */
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Search Results for "{searchQuery}"
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Found {getAllArticles().length} articles
              </p>
            </div>

            {getAllArticles().length === 0 ? (
              <div className="text-center p-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">No results found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Try different keywords or check your spelling</p>
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="outline"
                  className="rounded-full"
                >
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {getAllArticles().map((article, index) => (
                  <Card
                    key={`${article.journalName}-${index}`}
                    className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden cursor-pointer group"
                    onClick={() => {
                      setSelectedArticle(article);
                      setSelectedJournal(article.journalName);
                    }}
                  >
                    <CardHeader className="p-6 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs px-2 py-1 rounded-full">
                          {highlightSearchTerm(article.journalName, searchQuery)}
                        </Badge>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(article.publicationDate)}
                        </div>
                      </div>
                      <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 leading-tight">
                        {highlightSearchTerm(Array.isArray(article.title) ? article.title[0] : article.title, searchQuery)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed mb-4">
                        {highlightSearchTerm(Array.isArray(article.description) ? article.description[0] : article.description, searchQuery)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-sm group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Read Article
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to expand
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Journals Grid - Normal View */
          <div className="space-y-12">
            {JOURNALS.map((journalName: string) => {
              const journalArticles = articles[journalName] || [];
              const filteredArticles = getFilteredArticles(journalArticles, journalName);
              const displayArticles = filteredArticles.slice(0, 12); // Show max 12 articles per journal
              
              return (
                <div key={journalName} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                  {/* Journal Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-700 via-cyan-400 to-teal-400 dark:from-blue-400 dark:via-cyan-300 dark:to-teal-200 bg-clip-text text-transparent">
                        {journalName}
                      </h2>
                      <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-teal-100 dark:from-blue-900 dark:to-teal-900 text-blue-800 dark:text-blue-200 px-4 py-2 text-sm font-semibold rounded-full">
                        {filteredArticles.length} articles
                      </Badge>
                    </div>
                    <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 rounded-full"></div>
                  </div>

                  {globalLoading ? (
                    <div className="text-center p-12">
                      <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                      <p className="mt-6 text-lg text-gray-600 dark:text-gray-400">Loading articles...</p>
                    </div>
                  ) : displayArticles.length === 0 ? (
                    <div className="text-center p-12">
                      <div className="text-6xl mb-4">📚</div>
                      <p className="text-lg text-gray-600 dark:text-gray-400">No articles available for this journal.</p>
                    </div>
                  ) : (
                    /* Horizontal Scroll Container */
                    <div className="overflow-x-auto pb-4">
                      <div className="flex gap-6 min-w-max">
                        {displayArticles.map((article, index) => (
                          <div key={index} className="flex-shrink-0 w-80">
                            <Card
                              className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden cursor-pointer group h-full"
                              onClick={() => {
                                setSelectedArticle(article);
                                setSelectedJournal(journalName);
                              }}
                            >
                              <CardHeader className="p-6 pb-3">
                                <div className="flex items-start justify-between mb-3">
                                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs px-2 py-1 rounded-full">
                                    #{index + 1}
                                  </Badge>
                                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatDate(article.publicationDate)}
                                  </div>
                                </div>
                                <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 leading-tight">
                                  {Array.isArray(article.title) ? article.title[0] : article.title}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-6 pt-0 flex flex-col flex-grow">
                                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed mb-4 flex-grow">
                                  {Array.isArray(article.description) ? article.description[0] : article.description}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                  <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-sm group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Read Article
                                  </div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Click to expand
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Article Detail Modal */}
        <Dialog open={!!selectedArticle} onOpenChange={() => {
          setSelectedArticle(null);
          setSelectedJournal(null);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
            {selectedArticle && (
              <>
                <DialogHeader className="pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {selectedJournal && (
                        <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-teal-100 dark:from-blue-900 dark:to-teal-900 text-blue-800 dark:text-blue-200 px-3 py-1 text-sm font-semibold rounded-full">
                          {selectedJournal}
                        </Badge>
                      )}
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(selectedArticle.publicationDate)}
                      </div>
                    </div>
                  </div>
                  <DialogTitle className="text-2xl md:text-3xl font-bold leading-tight text-gray-900 dark:text-white">
                    {Array.isArray(selectedArticle.title) ? selectedArticle.title[0] : selectedArticle.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Abstract</h3>
                    <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">{Array.isArray(selectedArticle.description) ? selectedArticle.description[0] : selectedArticle.description}</p>
                  </div>
                  <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      asChild
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <a
                        href={selectedArticle.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <ExternalLink className="h-5 w-5 mr-2" />
                        Read Full Article
                      </a>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Compact Footer */}
      <footer className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400 dark:from-blue-400 dark:to-teal-300 font-semibold">
              SciJournal Digest
            </span>
            <span className="text-gray-500 dark:text-gray-400">© 2025</span>
            <a href="https://github.com/alperyzx/sciJournal/tree/triz" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

