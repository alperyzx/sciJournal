'use client';

import {useEffect, useState} from 'react';
import axios from 'axios';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '@/components/ui/accordion';
import FloatingTriangles from '@/components/FloatingTriangles';
import HeaderParticles from '@/components/HeaderParticles';

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
  const [articleGroups, setArticleGroups] = useState<ArticleGroup[]>([]);
  const [articleCache, setArticleCache] = useState<{[key: string]: Article[]}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<{[key: string]: number}>({});
  const [error, setError,] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the new API route
        const response = await axios.get('/api/rss');
        const groups: ArticleGroup[] = response.data;

        // Merge new articles with the existing cache
        const updatedCache: {[key: string]: Article[]} = {...articleCache};
        groups.forEach(group => {
          const journal = group.journalName;
          const existing = updatedCache[journal] || [];
          // Find new articles that are not in the cache (by link)
          const newArticles = group.articles.filter(article => 
            !existing.find(e => e.link === article.link)
          );
          // Merge new articles at the beginning
          let merged = [...newArticles, ...existing];
          // Remove duplicates based on link (keeping the first occurrence)
          const seen = new Set();
          merged = merged.filter(article => {
            if (seen.has(article.link)) return false;
            seen.add(article.link);
            return true;
          });
          // Sort by publicationDate descending and limit to 6
          merged.sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
          updatedCache[journal] = merged.slice(0, 6);
        });
        
        setArticleCache(updatedCache);
        // Update article groups from the cache
        const updatedGroups: ArticleGroup[] = Object.keys(updatedCache).map(journal => ({
          journalName: journal,
          articles: updatedCache[journal],
        }));
        setArticleGroups(updatedGroups);

        // Initialize current page for each journal if not already set
        const initialCurrentPage = {...currentPage};
        updatedGroups.forEach(group => {
          if (!initialCurrentPage[group.journalName]) {
            initialCurrentPage[group.journalName] = 1;
          }
        });
        setCurrentPage(initialCurrentPage);
      } catch (error) {
        console.error('Failed to fetch articles:', error);
        setError('Failed to fetch articles. Please try again later.');
        setArticleGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const handlePageChange = (journalName: string, newPage: number) => {
    setCurrentPage(prev => ({...prev, [journalName]: newPage}));
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

  return (
    <div className="min-h-screen modern-bg text-scijournal-text flex flex-col">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-white/75 dark:bg-gray-900/75 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Header particles animation */}
        <HeaderParticles />
        
        <div className="container mx-auto px-4 py-3 md:py-4 relative z-20 pointer-events-none">
          {/* SVG academic emblem and title - horizontally and vertically centered */}
          <div className="flex items-center justify-center gap-2 md:gap-4 pointer-events-auto">
            <svg className="h-6 w-6 md:h-8 lg:h-10 md:w-8 lg:w-10 flex-shrink-0" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" stroke="var(--scijournal-secondary)" strokeWidth="5"/>
              <line x1="30" y1="50" x2="70" y2="50" stroke="var(--scijournal-secondary)" strokeWidth="3"/>
            </svg>
            
            {/* Updated stylish title */}
            <div className="relative">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-teal-400 dark:from-blue-400 dark:to-teal-300 tracking-wide md:tracking-widest whitespace-nowrap">
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
      <div className="container mx-auto px-4 py-6 relative z-10 pt-16 md:pt-20 lg:pt-24 flex-grow">

        {loading ? (
          <div className="text-center p-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-4">Loading articles...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4 rounded-lg bg-red-50 border border-red-200">
            {error}
          </div>
        ) : articleGroups.length === 0 ? (
          <p className="text-center">No articles available at the moment.</p>
        ) : (
          <Accordion type="single" collapsible>
            {articleGroups.map((group) => {
              const journalName = group.journalName;
              const startIndex = (currentPage[journalName] - 1) * ARTICLES_PER_PAGE;
              const endIndex = startIndex + ARTICLES_PER_PAGE;
              const articlesToDisplay = group.articles.slice(startIndex, endIndex);
              const totalPages = Math.ceil(group.articles.length / ARTICLES_PER_PAGE);

              return (
                <AccordionItem key={journalName} value={journalName} className="mb-4 border rounded-md data-[state=open]:border-blue-500 data-[state=open]:bg-blue-50 dark:data-[state=open]:bg-blue-950/20 data-[state=open]:shadow-lg transition-all duration-200">
                  {/* Updated journal title styling */}
                  <AccordionTrigger className="text-lg md:text-xl lg:text-2xl font-semibold px-4 py-2 text-left w-full bg-gradient-to-r from-blue-500 to-teal-500 dark:from-blue-400 dark:to-teal-300 text-transparent bg-clip-text data-[state=open]:from-blue-600 data-[state=open]:to-teal-600 dark:data-[state=open]:from-blue-300 dark:data-[state=open]:to-teal-200 hover:from-blue-600 hover:to-teal-600 dark:hover:from-blue-300 dark:hover:to-teal-200 transition-all duration-200">
                    {journalName}
                  </AccordionTrigger>
                  <AccordionContent>
                    {articlesToDisplay.length > 0 ? (
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
                    ) : (
                      <p className="text-center p-4">No articles available for this journal.</p>
                    )}

                    {totalPages > 1 && (
                      <div className="flex justify-center mt-4">
                        <button
                          onClick={() => handlePageChange(journalName, currentPage[journalName] - 1)}
                          disabled={currentPage[journalName] === 1}
                          className="px-4 py-2 mr-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="px-4 py-2">{`Page ${currentPage[journalName]} of ${totalPages}`}</span>
                        <button
                          onClick={() => handlePageChange(journalName, currentPage[journalName] + 1)}
                          disabled={currentPage[journalName] === totalPages}
                          className="px-4 py-2 ml-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {/* Compact Footer */}
      <footer className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400 dark:from-blue-400 dark:to-teal-300 font-semibold">
                SciJournal Digest
              </span>
              <span className="text-gray-500 dark:text-gray-400">© 2025</span>
            </div>
            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a>
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact</a>
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

