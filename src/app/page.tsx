'use client';

import {useEffect, useState, useRef} from 'react';
import axios from 'axios';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '@/components/ui/accordion';
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
  const itemRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const headerHeight = 140; // px, optimized for mobile

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
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedQuery}`, 'gi');
    return journalArticles.filter(article =>
      regex.test(article.title.toLowerCase()) ||
      regex.test(article.description.toLowerCase()) ||
      regex.test(journalName.toLowerCase())
    );
  };

  // Get all articles for global search
  const getAllArticles = () => {
    if (!searchQuery.trim()) return [];
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedQuery}`, 'gi');
    const allArticles: (Article & { journalName: string })[] = [];

    JOURNALS.forEach(journalName => {
      const journalArticles = articles[journalName] || [];
      journalArticles.forEach(article => {
        // Handle title and description as string or array
        const title = Array.isArray(article.title) ? article.title[0] : article.title;
        const description = Array.isArray(article.description) ? article.description[0] : article.description;
        
        if (
          regex.test(title?.toLowerCase()) ||
          regex.test(description?.toLowerCase()) ||
          regex.test(journalName.toLowerCase())
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
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b(${escapedTerm}[a-zA-Z]*)`, 'gi');
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
        `fixed top-0 left-0 right-0 z-[999] bg-white/90 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-blue-900 shadow-sm overflow-hidden transition-[padding] duration-700 md:duration-600 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]${isScrolled ? ' py-0' : ''}`
      }>
        {/* Header particles animation */}
        <HeaderParticles />
        <div className={`container mx-auto px-3 sm:px-4 ${isScrolled ? 'py-2' : 'py-4 sm:py-5 md:py-7'} relative z-20 pointer-events-none transition-[padding] duration-700 md:duration-600 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]`}>
          {/* Title Row */}
          <div className="flex items-center justify-between pointer-events-auto mb-3 sm:mb-4">
            {/* Admin Link */}
            <div className="flex-1 flex justify-start">
              <a
                href="/admin"
                className="text-xs sm:text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors font-medium"
              >
                Admin
              </a>
            </div>
            
            {/* Updated stylish title */}
            <div className="relative">
              <h1 className={`${isScrolled ? 'text-lg sm:text-xl md:text-2xl lg:text-3xl' : 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'} font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-700 via-cyan-400 to-teal-400 dark:from-blue-400 dark:via-cyan-300 dark:to-teal-200 tracking-wide md:tracking-widest whitespace-nowrap transition-all duration-700 md:duration-600 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]`}>
                SciJournal Digest
              </h1>
              <svg className="absolute -bottom-0.5 md:-bottom-1 left-1/2 transform -translate-x-1/2" width="80" height="10" viewBox="0 0 80 10" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 'clamp(60px, 15vw, 120px)', height: 'clamp(6px, 1.5vw, 15px)' }}>
                <path d="M0 5 Q40 0 80 5" stroke="url(#gradient)" strokeWidth="1.5" fill="none"/>
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="80" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" className="dark:stop-color-[#60a5fa]"/>
                    <stop offset="100%" stopColor="#14b8a6" className="dark:stop-color-[#2dd4bf]"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            {/* Spacer for symmetry */}
            <div className="flex-1"></div>
          </div>
          
          {/* Search Row */}
          <div className="flex justify-center pointer-events-auto px-2 sm:px-0">
            <div className="relative w-full max-w-xs sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-full text-base sm:text-lg shadow-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {searchQuery && (
            <div className="text-center mt-2 pointer-events-auto px-2">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Press Enter or click on articles to search
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Floating triangles */}
      <FloatingTriangles />

      {/* Main Content with top padding to account for fixed header */}
      <div className={`container mx-auto px-3 sm:px-4 py-4 sm:py-6 relative z-10 ${isScrolled ? 'pt-16 sm:pt-20 md:pt-22 lg:pt-24' : 'pt-28 sm:pt-32 md:pt-36 lg:pt-40'} flex-grow transition-[padding] duration-700 md:duration-600 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]`} style={{ scrollPaddingBottom: `${headerHeight + 40}px` }}>

        {globalError && (
          <div className="text-center text-red-500 p-4 sm:p-6 rounded-xl bg-red-50 border border-red-200 mb-6 sm:mb-8">
            <div className="text-xl sm:text-2xl mb-2">⚠️</div>
            {globalError}
          </div>
        )}

        {/* Search Results or Journals Grid */}
        {searchQuery.trim() ? (
          /* Global Search Results */
          <div className="space-y-6 sm:space-y-8 relative z-[99999]">
            <div className="text-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 relative z-[99999] mt-6 sm:mt-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Search Results for "{searchQuery}"
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Found {getAllArticles().length} articles
              </p>
            </div>

            {getAllArticles().length === 0 ? (
              <div className="text-center p-8 sm:p-12">
                <div className="text-4xl sm:text-6xl mb-4">🔍</div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-white">No results found</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">Try different keywords or check your spelling</p>
                <Button
                  onClick={() => setSearchQuery('')}
                  variant="outline"
                  className="rounded-full text-sm sm:text-base"
                >
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {getAllArticles().map((article, index) => (
                  <Card
                    key={`${article.journalName}-${index}`}
                    className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden cursor-pointer group"
                    onClick={() => {
                      setSelectedArticle(article);
                      setSelectedJournal(article.journalName);
                    }}
                  >
                    <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                      <div className="flex items-start justify-between mb-2 sm:mb-3">
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs px-1.5 py-0.5 rounded-full truncate max-w-[60%] whitespace-nowrap">
                          {highlightSearchTerm(article.journalName, searchQuery)}
                        </Badge>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(article.publicationDate)}
                        </div>
                      </div>
                      <CardTitle className="text-base sm:text-lg font-bold line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 leading-tight">
                        {highlightSearchTerm(Array.isArray(article.title) ? article.title[0] : article.title, searchQuery)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed mb-3 sm:mb-4">
                        {highlightSearchTerm(Array.isArray(article.description) ? article.description[0] : article.description, searchQuery)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-xs sm:text-sm group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                          <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Read Article
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
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
          <>
            {/* Mobile View: Collapsible Accordion */}
            <div className="block sm:hidden">
              <Accordion type="multiple" className="space-y-4">
                {JOURNALS.map((journalName: string) => {
                  const journalArticles = articles[journalName] || [];
                  const filteredArticles = getFilteredArticles(journalArticles, journalName);
                  const displayArticles = filteredArticles.slice(0, 12);
                  
                  return (
                    <AccordionItem 
                      key={journalName} 
                      value={journalName}
                      className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                    >
                      <AccordionTrigger 
                        ref={el => { itemRefs.current[journalName] = el; }}
                        className="px-4 py-6 hover:no-underline [&[data-state=open]>svg]:rotate-180"
                        style={{ scrollMarginTop: headerHeight }}
                        onClick={() => {
                          // Add a delay to allow accordion state change
                          setTimeout(() => {
                            const el = itemRefs.current[journalName];
                            if (el) {
                              const rect = el.getBoundingClientRect();
                              const y = rect.top + window.scrollY - headerHeight - 10;
                              window.scrollTo({ top: y, behavior: 'smooth' });
                            }
                          }, 150);
                        }}
                      >
                        <div className="flex items-center justify-between w-full mr-4">
                          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-700 via-cyan-400 to-teal-400 dark:from-blue-400 dark:via-cyan-300 dark:to-teal-200 bg-clip-text text-transparent text-left">
                            {journalName}
                          </h2>
                          <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-teal-100 dark:from-blue-900 dark:to-teal-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0">
                            {displayArticles.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-0 pb-0">
                        <div className="px-4 pb-6">
                          <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 rounded-full mb-6"></div>
                          
                          {globalLoading ? (
                            <div className="text-center p-8">
                              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                              <p className="mt-4 text-base text-gray-600 dark:text-gray-400">Loading articles...</p>
                            </div>
                          ) : displayArticles.length === 0 ? (
                            <div className="text-center p-8">
                              <div className="text-4xl mb-4">📚</div>
                              <p className="text-base text-gray-600 dark:text-gray-400">No articles available for this journal.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {displayArticles.map((article, index) => (
                                <Card
                                  key={index}
                                  className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden cursor-pointer group"
                                  onClick={() => {
                                    setSelectedArticle(article);
                                    setSelectedJournal(journalName);
                                  }}
                                >
                                  <CardHeader className="p-4 pb-2">
                                    <div className="flex items-start justify-between mb-2">
                                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs px-1.5 py-0.5 rounded-full truncate max-w-[60%] whitespace-nowrap">
                                        #{index + 1}
                                      </Badge>
                                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {formatDate(article.publicationDate)}
                                      </div>
                                    </div>
                                    <CardTitle className="text-base font-bold line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 leading-tight">
                                      {Array.isArray(article.title) ? article.title[0] : article.title}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-4 pt-0 flex flex-col">
                                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed mb-3 flex-grow">
                                      {Array.isArray(article.description) ? article.description[0] : article.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-xs group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Read Article
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>

            {/* Desktop View: Original Layout */}
            <div className="hidden sm:block space-y-8 sm:space-y-12">
              {JOURNALS.map((journalName: string) => {
                const journalArticles = articles[journalName] || [];
                const filteredArticles = getFilteredArticles(journalArticles, journalName);
                const displayArticles = filteredArticles.slice(0, 12); // Show max 12 articles per journal
                
                return (
                  <div key={journalName} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
                    {/* Journal Header */}
                    <div className="mb-4 sm:mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-4">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-700 via-cyan-400 to-teal-400 dark:from-blue-400 dark:via-cyan-300 dark:to-teal-200 bg-clip-text text-transparent">
                          {journalName}
                        </h2>
                        <Badge variant="secondary" className="hidden bg-gradient-to-r from-blue-100 to-teal-100 dark:from-blue-900 dark:to-teal-900 text-blue-800 dark:text-blue-200 px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold rounded-full self-start sm:self-auto">
                          {filteredArticles.length} articles
                        </Badge>
                      </div>
                      <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 rounded-full"></div>
                    </div>

                    {globalLoading ? (
                      <div className="text-center p-8 sm:p-12">
                        <div className="inline-block h-8 w-8 sm:h-12 sm:w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                        <p className="mt-4 sm:mt-6 text-base sm:text-lg text-gray-600 dark:text-gray-400">Loading articles...</p>
                      </div>
                    ) : displayArticles.length === 0 ? (
                      <div className="text-center p-8 sm:p-12">
                        <div className="text-4xl sm:text-6xl mb-4">📚</div>
                        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">No articles available for this journal.</p>
                      </div>
                    ) : (
                      /* Desktop: Horizontal Scroll */
                      <div className="overflow-x-auto pb-4">
                        <div className="flex gap-4 sm:gap-6 min-w-max">
                          {displayArticles.map((article, index) => (
                            <div key={index} className="flex-shrink-0 w-64 sm:w-72 md:w-80">
                              <Card
                                className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden cursor-pointer group h-full"
                                onClick={() => {
                                  setSelectedArticle(article);
                                  setSelectedJournal(journalName);
                                }}
                              >
                                <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs px-1.5 py-0.5 rounded-full truncate max-w-[60%] whitespace-nowrap">
                                      #{index + 1}
                                    </Badge>
                                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      {formatDate(article.publicationDate)}
                                    </div>
                                  </div>
                                  <CardTitle className="text-sm sm:text-base md:text-lg font-bold line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 leading-tight">
                                    {Array.isArray(article.title) ? article.title[0] : article.title}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 pt-0 flex flex-col flex-grow">
                                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed mb-3 sm:mb-4 flex-grow">
                                    {Array.isArray(article.description) ? article.description[0] : article.description}
                                  </p>
                                  <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-xs sm:text-sm group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                                      <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                      Read Article
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
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
          </>
        )}

        {/* Article Detail Modal */}
        <Dialog open={!!selectedArticle} onOpenChange={() => {
          setSelectedArticle(null);
          setSelectedJournal(null);
        }}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl mx-2 sm:mx-auto">
            {selectedArticle && (
              <>
                <DialogHeader className="pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      {selectedJournal && (
                        <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-teal-100 dark:from-blue-900 dark:to-teal-900 text-blue-800 dark:text-blue-200 px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold rounded-full self-start whitespace-nowrap">
                          {selectedJournal}
                        </Badge>
                      )}
                      <div className="flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        {formatDate(selectedArticle.publicationDate)}
                      </div>
                    </div>
                  </div>
                  <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-gray-900 dark:text-white">
                    {Array.isArray(selectedArticle.title) ? selectedArticle.title[0] : selectedArticle.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-gray-200">Abstract</h3>
                    <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300">{Array.isArray(selectedArticle.description) ? selectedArticle.description[0] : selectedArticle.description}</p>
                  </div>
                  <div className="flex justify-end pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      asChild
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-semibold px-6 sm:px-8 py-2.5 sm:py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base"
                    >
                      <a
                        href={selectedArticle.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" />
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
      <footer className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 mt-6 sm:mt-8">
        <div className="container mx-auto px-3 sm:px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400 dark:from-blue-400 dark:to-teal-300 font-semibold">
              SciJournal Digest
            </span>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-gray-500 dark:text-gray-400">© 2025</span>
              <a href="https://github.com/alperyzx/sciJournal/tree/triz" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

