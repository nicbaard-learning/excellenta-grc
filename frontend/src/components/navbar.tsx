'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Search, Moon, Sun, User, LogOut,
  ChevronRight, Home, Settings
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { capabilities } from '@/lib/api';
import { cn } from '@/lib/utils';

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Dashboard',
  login: 'Login',
};

export function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const segments = pathname.split('/').filter(Boolean);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await capabilities.search(searchQuery);
        setSearchResults(res.results || []);
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchResult = (result: any) => {
    setSearchOpen(false);
    setSearchQuery('');
    if (result.type === 'domain') router.push(`/domains/${result.id}`);
    else if (result.type === 'capability') router.push(`/capabilities/${result.id}`);
    else if (result.type === 'sub_capability') router.push(`/sub-capabilities/${result.id}`);
    else if (result.type === 'checklist_item') {
      // Navigate to the parent sub-capability
      router.push(`/sub-capabilities/${result.id.split('-')[0]}`);
    }
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side - Logo & Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <Shield className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            <span className="hidden text-sm font-semibold sm:inline">Excellenta</span>
          </button>

          {segments.length > 0 && segments[0] !== 'dashboard' && (
            <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
              <ChevronRight className="h-3.5 w-3.5" />
              <button onClick={() => router.push('/dashboard')} className="hover:text-foreground transition-colors">
                <Home className="h-3.5 w-3.5" />
              </button>
              {segments.map((segment, i) => {
                const isLast = i === segments.length - 1;
                const label = breadcrumbMap[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <div key={segment} className="flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className={cn(isLast ? 'text-foreground font-medium' : 'hover:text-foreground transition-colors cursor-pointer')}>
                      {label.length > 20 ? label.slice(0, 20) + '...' : label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side - Search, Theme, User */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <Search className="h-4 w-4" />
            </button>

            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-12 w-80 origin-top-right"
                >
                  <div className="glass rounded-xl p-2 shadow-xl">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search capabilities, items..."
                        className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    {searching && (
                      <div className="flex items-center justify-center py-4">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
                        {searchResults.map((result, i) => (
                          <button
                            key={i}
                            onClick={() => handleSearchResult(result)}
                            className="w-full rounded-lg px-3 py-2 text-left hover:bg-secondary transition-colors"
                          >
                            <p className="text-sm font-medium text-foreground">{result.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              <span className="capitalize">{result.type.replace('_', ' ')}</span>
                              {result.parent_path && <span> — {result.parent_path}</span>}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">No results found</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium md:inline">{user.full_name}</span>
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-12 w-48 origin-top-right"
                >
                  <div className="glass rounded-xl p-1.5 shadow-xl">
                    <div className="border-b border-border px-3 py-2">
                      <p className="text-sm font-medium text-foreground">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                    </div>
                    <button
                      onClick={() => { setUserMenuOpen(false); router.push('/profile'); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); router.push('/login'); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
