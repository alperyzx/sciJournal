'use client';

import {useEffect, useState, useRef} from 'react';
import axios from 'axios';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '@/components/ui/accordion';
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
  const [currentPage, setCurrentPage] = useState<{ [journal: string]: number }>({});
  const [openJournal, setOpenJournal] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | HTMLButtonElement | null }>({});
  const headerHeight = 112; // px, matches largest header (pt-28)

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

  const handlePageChange = (journalName: string, newPage: number) => {
    setCurrentPage(prev => ({...prev, [journalName]: newPage}));
  };

  // Accordion open handler
  const handleAccordionChange = (journal: string | null) => {
    setOpenJournal(journal);
    if (journal && currentPage[journal] === undefined) {
      setCurrentPage(prev => ({ ...prev, [journal]: 1 }));
    }
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
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen modern-bg text-scijournal-text flex flex-col">
      {/* Fixed Header */}
      <div className={
        `fixed top-0 left-0 right-0 z-[9999] bg-white/90 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-blue-900 shadow-sm overflow-hidden transition-all duration-300 ${isScrolled ? 'py-0' : ''}`
      }>
        {/* Header particles animation */}
        <HeaderParticles />
        <div className={`container mx-auto px-4 ${isScrolled ? 'py-2 md:py-2' : 'py-5 md:py-7'} relative z-20 pointer-events-none transition-all duration-300`}>
          {/* SVG academic emblem and title - horizontally and vertically centered */}
          <div className="flex items-center justify-center gap-2 md:gap-4 pointer-events-auto">
            <svg className={`${isScrolled ? 'h-6 w-6 md:h-7 lg:h-8 md:w-7 lg:w-8' : 'h-8 w-8 md:h-10 lg:h-12 md:w-10 lg:w-12'} flex-shrink-0 transition-all duration-300`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" stroke="var(--scijournal-secondary)" strokeWidth="5"/>
              <line x1="30" y1="50" x2="70" y2="50" stroke="var(--scijournal-secondary)" strokeWidth="3"/>
            </svg>
            {/* Updated stylish title */}
            <div className="relative">
              <h1 className={`${isScrolled ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-3xl md:text-4xl lg:text-5xl'} font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-700 via-cyan-400 to-teal-400 dark:from-blue-400 dark:via-cyan-300 dark:to-teal-200 tracking-wide md:tracking-widest whitespace-nowrap transition-all duration-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]`}>
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
        </div>
      </div>

      {/* Floating triangles */}
      <FloatingTriangles />

      {/* Main Content with top padding to account for fixed header */}
      <div className="container mx-auto px-4 py-6 relative z-10 pt-28 md:pt-32 lg:pt-36 flex-grow" style={{ scrollPaddingBottom: `${headerHeight + 40}px` }}>

        {globalError && (
          <div className="text-center text-red-500 p-4 rounded-lg bg-red-50 border border-red-200">
            {globalError}
          </div>
        )}
        <Accordion type="single" collapsible value={openJournal ?? undefined} onValueChange={handleAccordionChange}>
          {JOURNALS.map((journalName: string) => {
            const journalArticles = articles[journalName] || [];
            const page = currentPage[journalName] || 1;
            const startIndex = (page - 1) * ARTICLES_PER_PAGE;
            const endIndex = startIndex + ARTICLES_PER_PAGE;
            const articlesToDisplay = journalArticles.slice(startIndex, endIndex);
            const totalPages = Math.ceil(journalArticles.length / ARTICLES_PER_PAGE);
            const isOpen = openJournal === journalName;
            return (
              <AccordionItem
                key={journalName}
                value={journalName}
                className="mb-4 border rounded-md data-[state=open]:border-blue-600 data-[state=open]:bg-blue-100/80 dark:data-[state=open]:bg-blue-900/70 data-[state=open]:shadow-lg transition-all duration-200"
              >
                <AccordionTrigger
                  ref={el => { itemRefs.current[journalName] = el; }}
                  className="text-lg md:text-xl lg:text-2xl font-semibold px-4 py-2 text-left w-full bg-gradient-to-r from-blue-700 to-teal-500 dark:from-blue-200 dark:to-cyan-300 text-transparent bg-clip-text data-[state=open]:from-blue-800 data-[state=open]:to-teal-700 dark:data-[state=open]:from-blue-100 dark:data-[state=open]:to-cyan-200 hover:from-blue-800 hover:to-teal-700 dark:hover:from-blue-100 dark:hover:to-cyan-200 transition-all duration-200 drop-shadow-[0_1px_6px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
                  style={{ scrollMarginTop: headerHeight }}
                  onClick={() => {
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
                  {journalName}
                </AccordionTrigger>
                <AccordionContent>
                  {globalLoading && isOpen ? (
                    <div className="text-center p-8">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                      <p className="mt-4">Loading articles...</p>
                    </div>
                  ) : !globalLoading && journalArticles.length === 0 ? (
                    <p className="text-center p-4">No articles available for this journal.</p>
                  ) : !globalLoading ? (
                    <>
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 px-4 py-2">
                        {articlesToDisplay.map((article, index) => (
                          <Card key={index} className="bg-card rounded-lg shadow-md overflow-hidden flex flex-col">
                            <CardHeader className="p-4">
                              <CardTitle className="text-base md:text-lg font-medium line-clamp-2">{article.title}</CardTitle>
                              <CardDescription className="text-xs md:text-sm text-muted-foreground">
                                {formatDate(article.publicationDate)}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 flex-grow">
                              <p className="article-text text-sm md:text-base line-clamp-3">{article.description}</p>
                            </CardContent>
                            <div className="p-4 bg-muted">
                              <a
                                href={article.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block text-primary dark:text-blue-400 hover:underline"
                              >
                                Read Full Article
                              </a>
                            </div>
                          </Card>
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div className="flex justify-center mt-4">
                          <button
                            onClick={() => handlePageChange(journalName, page - 1)}
                            disabled={page === 1}
                            className="px-4 py-2 mr-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="px-4 py-2">{`Page ${page} of ${totalPages}`}</span>
                          <button
                            onClick={() => handlePageChange(journalName, page + 1)}
                            disabled={page === totalPages}
                            className="px-4 py-2 ml-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  ) : null}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
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

