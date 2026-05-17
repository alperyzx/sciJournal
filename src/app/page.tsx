'use client';

import dynamic from 'next/dynamic';
import {useEffect, useState, useRef, useSyncExternalStore} from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import axios from 'axios';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import ProfilePanel from '@/components/ProfilePanel';
import PrivacyPanel from '@/components/PrivacyPanel';
import TermsPanel from '@/components/TermsPanel';
import LoginPanel from '@/components/LoginPanel';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from '@/components/ui/accordion';
import {Search, Calendar, ExternalLink, LogOut, Moon, Settings, Sun} from 'lucide-react';
const FloatingTriangles = dynamic(() => import('@/components/FloatingTriangles'), { ssr: false });
const HeaderParticles = dynamic(() => import('@/components/HeaderParticles'), { ssr: false });

interface Article {
  title: string;
  link: string;
  description: string;
  publicationDate: string;
}

interface HighlightedArticle extends Article {
  id: string;
  journalName: string;
  votes: number;
  upvoted?: boolean;
}

interface ArticleGroup {
  journalName: string;
  articles: Article[];
}

interface JournalsAndArticlesResponse {
  journals: Array<{ journalName: string }>;
  articles: ArticleGroup[];
}

const ARTICLES_PER_PAGE = 6;

const LoadingSection = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const dots = Array.from({ length: 12 });

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-white/80 p-4 shadow-xl backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-900/80 sm:p-5 overflow-hidden relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-10 top-6 h-28 w-28 rounded-full bg-blue-500/15 blur-3xl animate-pulse" />
        <div className="absolute right-2 top-10 h-32 w-32 rounded-full bg-teal-400/15 blur-3xl animate-pulse [animation-delay:900ms]" />
        <div className="absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-cyan-400/10 blur-3xl animate-pulse [animation-delay:1400ms]" />
      </div>

      <div className="relative mb-4 sm:mb-6 text-center">
        <div className="inline-flex flex-col items-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-700 via-cyan-400 to-teal-400 dark:from-blue-400 dark:via-cyan-300 dark:to-teal-200 bg-clip-text text-transparent tracking-wide md:tracking-widest">
            {title}
          </h2>
          <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span>{subtitle}</span>
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse [animation-delay:700ms]" />
          </div>
          <div className="mt-3 h-1 w-36 sm:w-48 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        {dots.slice(0, 3).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/70 shadow-lg overflow-hidden"
          >
            <div className="p-4 pb-3 space-y-3 animate-pulse">
              <div className="flex items-center justify-between gap-3">
                <div className="h-5 w-28 rounded-full bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-900/70 dark:via-cyan-900/70 dark:to-teal-900/70" />
                <div className="h-4 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-4/6 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="h-16 rounded-lg border border-dashed border-blue-200/70 dark:border-blue-800/70 bg-gradient-to-br from-blue-50/80 via-cyan-50/60 to-teal-50/80 dark:from-gray-900/40 dark:via-gray-800/40 dark:to-gray-900/40" />
            </div>
            <div className="px-4 pb-4 flex items-center justify-between">
              <div className="h-4 w-16 rounded-full bg-blue-100 dark:bg-blue-900/60" />
              <div className="h-7 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-4 flex justify-center gap-1.5">
        {Array.from({ length: 14 }).map((_, index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-cyan-400/70 animate-pulse"
            style={{ animationDelay: `${index * 90}ms` }}
          />
        ))}
      </div>
    </section>
  );
};

function subscribeToSystemTheme(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onStoreChange();

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handler);
  } else {
    mediaQuery.addListener(handler);
  }

  return () => {
    if (typeof mediaQuery.removeEventListener === 'function') {
      mediaQuery.removeEventListener('change', handler);
    } else {
      mediaQuery.removeListener(handler);
    }
  };
}

function getSystemThemeSnapshot() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const Home: React.FC = () => {
  const { data: session } = useSession();
  const [highlighted, setHighlighted] = useState<HighlightedArticle[]>([]);
  const [highlightedLoading, setHighlightedLoading] = useState(true);
  // UI-visible placeholder for highlighted section — only show after a short delay
  const [showHighlightedPlaceholder, setShowHighlightedPlaceholder] = useState(false);
  const [upvoteLoading, setUpvoteLoading] = useState(false);
  const [themePreference, setThemePreference] = useState<'system' | 'light' | 'dark'>('system');
  const [journalsList, setJournalsList] = useState<string[]>([]);
  const userDisplayName = session?.user?.name?.trim() || session?.user?.email?.split('@')[0] || 'Reader';
  // Per-journal state
  const [articles, setArticles] = useState<{ [journal: string]: Article[] }>({});
  const [loading, setLoading] = useState<{ [journal: string]: boolean }>({});
  const [error, setError] = useState<{ [journal: string]: string | null }>({});
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<string | null>(null);
  const [modalVotes, setModalVotes] = useState<number | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const itemRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const headerHeight = 140; // px, optimized for mobile
  const userInitial = (session?.user?.name?.trim()?.[0] || session?.user?.email?.trim()?.[0] || 'R').toUpperCase();

  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    () => false
  );
  const isDarkMode = themePreference === 'system' ? systemPrefersDark : themePreference === 'dark';

  useEffect(() => {
    // Delay showing the highlighted LoadingSection to avoid flicker for fast responses
    let timer: number | undefined;
    if (highlightedLoading) {
      timer = window.setTimeout(() => setShowHighlightedPlaceholder(true), 2000);
    } else {
      setShowHighlightedPlaceholder(false);
    }
    return () => { if (timer) window.clearTimeout(timer); };
  }, [highlightedLoading]);

  // Open the profile dialog only once per user record.
  useEffect(() => {
    if (!session?.user?.showProfileToast) return;

    const userKey = session.user.id || session.user.email;
    if (!userKey) return;

    const storageKey = `profileToastSeen:${userKey}`;
    try {
      if (localStorage.getItem(storageKey) === 'true') {
        return;
      }
      localStorage.setItem(storageKey, 'true');
    } catch (e) {}

    setShowProfileDialog(true);
  }, [session?.user?.showProfileToast, session?.user?.id, session?.user?.email]);

  useEffect(() => {
    // (moved) Delay showing journals placeholders is applied after `globalLoading` is declared
  }, [/* placeholder to satisfy eslint if needed */]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setThemePreference(nextDark ? 'dark' : 'light');
  };

  // Global loading state for all journals
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  // UI-visible placeholder for journals area — show only after a short delay
  const [showJournalsPlaceholder, setShowJournalsPlaceholder] = useState(false);

  useEffect(() => {
    // Delay showing journals placeholders (top-level and per-journal) to avoid flicker
    let t: number | undefined;
    if (globalLoading) {
      t = window.setTimeout(() => setShowJournalsPlaceholder(true), 3000);
    } else {
      setShowJournalsPlaceholder(false);
    }
    return () => { if (t) window.clearTimeout(t); };
  }, [globalLoading]);

  // Fetch all articles for all journals on mount
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setGlobalLoading(true);
      setGlobalError(null);
      try {
        const response = await axios.get('/api/journals?includeArticles=true');
        const payload = response.data as JournalsAndArticlesResponse;
        const groups: ArticleGroup[] = payload.articles || [];
        const articlesMap: { [journal: string]: Article[] } = {};
        groups.forEach(group => {
          articlesMap[group.journalName] = group.articles;
        });
        if (!cancelled) {
          setArticles(articlesMap);
          const names = Array.isArray(payload.journals) ? payload.journals.map(j => j.journalName) : [];
          if (names.length > 0) setJournalsList(names);
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
    // fetch highlighted separately
    const fetchHighlighted = async () => {
      setHighlightedLoading(true);
      try {
        const res = await axios.get('/api/articles/highlighted');
        setHighlighted((res.data || []) as HighlightedArticle[]);
      } catch (e) {
        // ignore
      } finally {
        setHighlightedLoading(false);
      }
    };
    fetchHighlighted();
    return () => { cancelled = true; };
  }, []);

  // derive visible journals from session preferences and DB-backed journals list
  const visibleJournals: string[] = (() => {
    try {
      const prefs = (session?.user as any)?.selectedJournals as string[] | undefined;
      if (prefs && prefs.length > 0) return prefs.filter(p => journalsList.includes(p));
    } catch (e) {}
    return journalsList;
  })();

  useEffect(() => {
    if (!selectedArticle) {
      setModalVotes(null);
      return;
    }
    const title = Array.isArray(selectedArticle.title) ? selectedArticle.title[0] : selectedArticle.title;
    const pub = selectedArticle.publicationDate;
    const journal = selectedJournal;
    const found = highlighted.find(h => h.title === title && h.publicationDate === pub && h.journalName === journal);
    setModalVotes(found ? found.votes : null);
  }, [selectedArticle, highlighted, selectedJournal]);

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
    highlighted.forEach(article => {
      const title = Array.isArray(article.title) ? article.title[0] : article.title;
      const description = Array.isArray(article.description) ? article.description[0] : article.description;

      if (
        regex.test(title?.toLowerCase()) ||
        regex.test(description?.toLowerCase()) ||
        regex.test(article.journalName.toLowerCase())
      ) {
        allArticles.push({
          title,
          link: article.link || '',
          description: description || '',
          publicationDate: article.publicationDate,
          journalName: article.journalName,
        });
      }
    });

    // Build a set of keys for highlighted articles to avoid duplicates in journal lists
    const highlightedKeySet = new Set<string>();
    highlighted.forEach(article => {
      const title = Array.isArray(article.title) ? article.title[0] : article.title;
      const key = `${article.journalName}::${(title || '').toString().trim().toLowerCase()}::${article.publicationDate || ''}`;
      highlightedKeySet.add(key);
    });

    visibleJournals.forEach(journalName => {
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
          const articleKey = `${journalName}::${(title || '').toString().trim().toLowerCase()}::${article.publicationDate || ''}`;
          if (!highlightedKeySet.has(articleKey)) {
            allArticles.push({ ...article, journalName });
          }
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
          <div className="flex items-center justify-end pointer-events-auto mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Left: theme toggle */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-border bg-background/90 text-foreground hover:text-background/90 hover:bg-foreground shadow-lg"
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              </Button>

              {/* Middle: profile (or sign-in) - keep centered */}
              {!session?.user ? (
                <div className="flex items-center justify-center">
                  <Button
                    onClick={() => setShowLoginDialog(true)}
                    size="icon"
                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-teal-600 transition-all"
                    aria-label="Sign in"
                    title="Sign in"
                  >
                    <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>

                  <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                    <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl mx-2 sm:mx-auto p-4">
                        <DialogTitle className="sr-only">Sign in</DialogTitle>
                        <LoginPanel />
                      </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Button
                    size="icon"
                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-teal-600 transition-all"
                    title={userDisplayName}
                    aria-label={`Open profile for ${userDisplayName}`}
                    onClick={() => setShowProfileDialog(true)}
                  >
                    {userInitial}
                  </Button>

                  <Dialog
                    open={showProfileDialog}
                    onOpenChange={(open) => {
                      setShowProfileDialog(open);
                    }}
                  >
                    <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl mx-2 sm:mx-auto">
                        <DialogTitle className="sr-only">Profile</DialogTitle>
                        <ProfilePanel />
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* Right: logout (or placeholder to keep profile visually centered) */}
              {session?.user ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-full border-gray-200 bg-white/90 text-gray-700 hover:text-background/90 hover:bg-foreground shadow-none dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200 dark:hover:text-background/90 dark:hover:bg-foreground"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              ) : (
                <div className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />
              )}
            </div>
          </div>
          {/* Title Row */}
          <div className="flex items-center justify-center pointer-events-auto mb-3 sm:mb-4">
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
      <div className={`container mx-auto px-3 sm:px-4 py-4 sm:py-6 relative z-10 ${isScrolled ? 'pt-16 sm:pt-20 md:pt-22 lg:pt-24' : 'pt-40 sm:pt-44 md:pt-52 lg:pt-56'} flex-grow transition-[padding] duration-700 md:duration-600 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]`} style={{ scrollPaddingBottom: `${headerHeight + 40}px` }}>

        {globalError && (
          <div className="text-center text-red-500 p-4 sm:p-6 rounded-xl bg-red-50 border border-red-200 mb-6 sm:mb-8">
            <div className="text-xl sm:text-2xl mb-2">⚠️</div>
            {globalError}
          </div>
        )}

        {/* Highlighted articles */}
        {showHighlightedPlaceholder && !searchQuery.trim() && (
          <LoadingSection title="SciJournal Digest" subtitle="Gathering highlighted articles" />
        )}
        {highlighted.length > 0 && !searchQuery.trim() && (
          <section className="mb-6 rounded-2xl border border-white/10 bg-white/80 p-4 shadow-xl backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-900/80 sm:p-5">
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-4">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-700 via-cyan-400 to-teal-400 dark:from-blue-400 dark:via-cyan-300 dark:to-teal-200 bg-clip-text text-transparent">
                  Highlighted Articles
                </h2>
              </div>
              <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400 rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {highlighted.map((a) => {
                const title = Array.isArray(a.title) ? a.title[0] : a.title;
                const desc = Array.isArray(a.description) ? a.description[0] : a.description;
                const art: Article = { title, link: a.link || '', description: desc || '', publicationDate: a.publicationDate || '' };
                return (
                  <Card
                    key={a.id}
                    className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden cursor-pointer group"
                    onClick={() => {
                      setSelectedArticle(art);
                      setSelectedJournal(a.journalName);
                    }}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs px-1.5 py-0.5 rounded-full truncate max-w-[60%] whitespace-nowrap">{a.journalName}</Badge>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(a.publicationDate)}</div>
                      </div>
                      <CardTitle className="text-sm font-bold line-clamp-2 text-gray-900 dark:text-gray-300">{title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex flex-col">
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3 mb-3 flex-grow">{desc}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-blue-600 dark:text-blue-400">Votes: {a.votes}</div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[11px] font-medium border-gray-200 bg-white/70 text-gray-600 shadow-none hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                          onClick={async (e) => {
                          // prevent card click opening modal
                          e.stopPropagation();
                          if (!session?.user?.email) return window.location.assign('/login');
                          setUpvoteLoading(true);
                          try {
                            await axios.post('/api/articles/upvote', { articleId: a.id });
                            const res = await axios.get('/api/articles/highlighted');
                            setHighlighted((res.data || []) as HighlightedArticle[]);
                          } catch (e) {
                            // ignore
                          } finally { setUpvoteLoading(false); }
                          }}
                          disabled={upvoteLoading}
                        >
                          {a.upvoted ? 'Upvoted' : 'Upvote'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Search Results or Journals Grid */}
        {searchQuery.trim() ? (
          /* Global Search Results */
          <div className="space-y-6 sm:space-y-8 relative z-[99999]">
            <div className="text-center bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 relative z-[99999] mt-6 sm:mt-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-300 mb-2">
                Search Results for "{searchQuery}"
              </h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Found {getAllArticles().length} articles
              </p>
            </div>

            {getAllArticles().length === 0 ? (
              <div className="text-center p-8 sm:p-12">
                <div className="text-4xl sm:text-6xl mb-4">🔍</div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800 dark:text-gray-300">No results found</h3>
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
                        <div className="flex flex-wrap items-center gap-2 max-w-[70%]">
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs px-1.5 py-0.5 rounded-full truncate whitespace-nowrap">
                            {highlightSearchTerm(article.journalName, searchQuery)}
                          </Badge>
                          {highlighted.some(item => item.journalName === article.journalName && (item.title === article.title || item.title === (Array.isArray(article.title) ? article.title[0] : article.title))) && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              Highlighted
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(article.publicationDate)}
                        </div>
                      </div>
                      <CardTitle className="text-base sm:text-lg font-bold line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 leading-tight text-gray-900 dark:text-gray-300">
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
            {showJournalsPlaceholder && visibleJournals.length === 0 && !searchQuery.trim() && (
              <LoadingSection
                title="SciJournal Digest"
                subtitle="Gathering journal sections"
              />
            )}

            {/* Mobile View: Collapsible Accordion */}
            <div className="block sm:hidden">
              <Accordion type="multiple" className="space-y-4">
                {visibleJournals.map((journalName: string) => {
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
                          
                          {showJournalsPlaceholder ? (
                            <LoadingSection
                              title={journalName}
                              subtitle="Gathering journal articles"
                            />
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
                                    <CardTitle className="text-base font-bold line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 leading-tight text-gray-900 dark:text-gray-300">
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
              {visibleJournals.map((journalName: string) => {
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

                    {showJournalsPlaceholder ? (
                      <LoadingSection
                        title={journalName}
                        subtitle="Gathering journal articles"
                      />
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
                  <DialogTitle className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-gray-900 dark:text-gray-300">
                    {Array.isArray(selectedArticle.title) ? selectedArticle.title[0] : selectedArticle.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-gray-200">Abstract</h3>
                    <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300">{Array.isArray(selectedArticle.description) ? selectedArticle.description[0] : selectedArticle.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {modalVotes !== null ? (
                        <>Votes: <span id="modal-votes">{modalVotes}</span></>
                      ) : (
                        <span className="invisible">Votes: <span id="modal-votes">—</span></span>
                      )}
                    </div>
                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[11px] font-medium border-gray-200 bg-white/70 text-gray-600 shadow-none hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                        onClick={async () => {
                        if (!session?.user?.email) return window.location.assign('/login');
                        setUpvoteLoading(true);
                        try {
                          const payload = { journalName: selectedJournal, title: Array.isArray(selectedArticle.title) ? selectedArticle.title[0] : selectedArticle.title, publicationDate: selectedArticle.publicationDate, link: selectedArticle.link, description: Array.isArray(selectedArticle.description) ? selectedArticle.description[0] : selectedArticle.description };
                          const res = await axios.post('/api/articles/upvote', payload);
                          // refresh highlighted
                          const r2 = await axios.get('/api/articles/highlighted');
                          setHighlighted((r2.data || []) as HighlightedArticle[]);
                          // update modal votes
                          const votes = res.data?.votes ?? null;
                          if (votes !== null) setModalVotes(votes);
                        } catch (e) {
                          // ignore
                        } finally { setUpvoteLoading(false); }
                        }} disabled={upvoteLoading}>{highlighted.find(item => item.title === (Array.isArray(selectedArticle.title) ? selectedArticle.title[0] : selectedArticle.title) && item.publicationDate === selectedArticle.publicationDate && item.journalName === selectedJournal)?.upvoted ? 'Upvoted' : 'Upvote'}</Button>
                    </div>
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
              <a href="https://github.com/alperyzx/sciJournal" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a>
              <button type="button" onClick={() => setShowPrivacyDialog(true)} className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy</button>
              <button type="button" onClick={() => setShowTermsDialog(true)} className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Privacy Dialog */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl mx-2 sm:mx-auto p-4">
          <DialogTitle className="sr-only">Privacy</DialogTitle>
          <PrivacyPanel />
        </DialogContent>
      </Dialog>

      {/* Terms Dialog */}
      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl mx-2 sm:mx-auto p-4">
          <DialogTitle className="sr-only">Terms</DialogTitle>
          <TermsPanel />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;

