import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, X, Bookmark } from 'lucide-react';
import FilterSidebar from './FilterSidebar';
import JobFeed from './JobFeed';
import ToastNotification, { useToast } from './ToastNotification';

const DEFAULT_FILTERS = {
  location: '',
  work_types: [],
  company_types: [],
  experience_levels: [],
  skills: [],
};
const PER_PAGE = 20;

export default function JobSearchEngine({ backendUrl }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState('match_score');

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Mobile filter drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { toasts, addToast, removeToast } = useToast();
  const debounceRef = useRef(null);

  // ── Build search URL params ────────────────────────────────────────────────
  const buildParams = useCallback((pg = 1) => {
    const p = new URLSearchParams();
    if (query.trim()) p.set('q', query.trim());
    if (filters.location) p.set('location', filters.location);
    if (filters.work_types.length) p.set('work_types', filters.work_types.join(','));
    if (filters.company_types.length) p.set('company_types', filters.company_types.join(','));
    if (filters.experience_levels.length) p.set('experience_levels', filters.experience_levels.join(','));
    if (filters.skills.length) p.set('skills', filters.skills.join(','));
    p.set('sort_by', sortBy);
    p.set('page', pg);
    p.set('per_page', PER_PAGE);
    return p.toString();
  }, [query, filters, sortBy]);

  // ── Fetch first page ───────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setPage(1);
    try {
      const res = await fetch(`${backendUrl}/api/jobs/search?${buildParams(1)}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setJobs(data.jobs || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, buildParams]);

  // ── Debounce search on query/filter/sort change ────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchJobs, 300);
    return () => clearTimeout(debounceRef.current);
  }, [fetchJobs]);

  // ── Infinite scroll: load next page ───────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || page >= pages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(`${backendUrl}/api/jobs/search?${buildParams(nextPage)}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Load more failed');
      const data = await res.json();
      setJobs(prev => [...prev, ...(data.jobs || [])]);
      setPage(nextPage);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }, [backendUrl, buildParams, loadingMore, page, pages]);

  // ── Save / Unsave ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async (jobId) => {
    const res = await fetch(`${backendUrl}/api/jobs/save/${jobId}`, {
      method: 'POST', credentials: 'include',
    });
    if (!res.ok) throw new Error('Save failed');
    addToast('Job saved to your profile!', 'save');
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, is_saved: true } : j));
  }, [backendUrl, addToast]);

  const handleUnsave = useCallback(async (jobId) => {
    const res = await fetch(`${backendUrl}/api/jobs/save/${jobId}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (!res.ok) throw new Error('Unsave failed');
    addToast('Job removed from saved list.', 'unsave');
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, is_saved: false } : j));
  }, [backendUrl, addToast]);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleReset = () => {
    setQuery('');
    setFilters(DEFAULT_FILTERS);
    setSortBy('match_score');
  };

  const handleSortChange = (val) => {
    setSortBy(val);
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>

        {/* ── Search Bar ────────────────────────────────────────────────────── */}
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{
              position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
              color: '#64748b', pointerEvents: 'none',
            }} />
            <input
              id="job-search-input"
              className="input-field"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by job title, company, or keyword..."
              style={{ paddingLeft: '42px', paddingRight: '42px', width: '100%', fontSize: '15px', height: '46px' }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            {/* Quick filter chips */}
            {[
              { label: '🌐 Remote', fn: () => handleFiltersChange({ ...filters, work_types: filters.work_types.includes('Remote') ? filters.work_types.filter(w => w !== 'Remote') : [...filters.work_types, 'Remote'] }) },
              { label: '🚀 Startup', fn: () => handleFiltersChange({ ...filters, company_types: filters.company_types.includes('Startup') ? filters.company_types.filter(c => c !== 'Startup') : [...filters.company_types, 'Startup'] }) },
              { label: '🎓 Fresher', fn: () => handleFiltersChange({ ...filters, experience_levels: filters.experience_levels.includes('0-1 yrs') ? filters.experience_levels.filter(e => e !== '0-1 yrs') : [...filters.experience_levels, '0-1 yrs'] }) },
              { label: '🏢 Product', fn: () => handleFiltersChange({ ...filters, company_types: filters.company_types.includes('Product-based') ? filters.company_types.filter(c => c !== 'Product-based') : [...filters.company_types, 'Product-based'] }) },
            ].map(chip => (
              <button
                key={chip.label}
                onClick={chip.fn}
                style={{
                  padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                  cursor: 'pointer', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(2,132,199,0.12)'; e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.borderColor = 'rgba(2,132,199,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                {chip.label}
              </button>
            ))}

            {/* Mobile: Filters button */}
            <button
              className="btn"
              onClick={() => setDrawerOpen(true)}
              style={{
                display: 'none',
                alignItems: 'center', gap: '6px', padding: '5px 14px',
                fontSize: '12.5px', marginLeft: 'auto',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                '@media(maxWidth:768px)': { display: 'flex' },
              }}
              id="open-filter-drawer-btn"
            >
              <SlidersHorizontal size={14} /> Filters
            </button>
          </div>
        </div>

        {/* ── Two-column layout ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flex: 1 }}>

          {/* Filter Sidebar (desktop) */}
          <div className="filter-sidebar-desktop" style={{ width: '260px', flexShrink: 0, position: 'sticky', top: '80px' }}>
            <div className="glass-card" style={{ padding: '20px' }}>
              <FilterSidebar
                filters={filters}
                onChange={handleFiltersChange}
                onReset={handleReset}
              />
            </div>
          </div>

          {/* Job Feed */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <JobFeed
              jobs={jobs}
              loading={loading}
              loadingMore={loadingMore}
              total={total}
              hasMore={page < pages}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              onLoadMore={handleLoadMore}
              onSave={handleSave}
              onUnsave={handleUnsave}
            />
          </div>
        </div>
      </div>

      {/* ── Mobile Filter Drawer ───────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: '310px',
              background: 'var(--sidebar-bg)', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
              animation: 'slideInRight 0.25s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            <FilterSidebar
              filters={filters}
              onChange={handleFiltersChange}
              onReset={handleReset}
              isDrawer
              onClose={() => setDrawerOpen(false)}
            />
          </div>
          <style>{`
            @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
            @media (min-width: 769px) { .filter-sidebar-desktop { display: block !important } #open-filter-drawer-btn { display: none !important } }
            @media (max-width: 768px) { .filter-sidebar-desktop { display: none !important } #open-filter-drawer-btn { display: flex !important } }
          `}</style>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} removeToast={removeToast} />
    </>
  );
}
