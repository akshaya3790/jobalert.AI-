import React, { useEffect, useRef } from 'react';
import { Search, Briefcase, TrendingUp } from 'lucide-react';
import JobCard from './JobCard';

function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: '20px', borderLeft: '3px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', gap: '14px', marginBottom: '12px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: '14px', width: '65%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: '12px', width: '40%', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        {[60, 80, 50].map((w, i) => (
          <div key={i} style={{ height: '22px', width: `${w}px`, background: 'rgba(255,255,255,0.04)', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
      <div style={{ height: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </div>
  );
}

export default function JobFeed({
  jobs, loading, loadingMore, total, hasMore,
  sortBy, onSortChange,
  onLoadMore, onSave, onUnsave, onViewDetails,
}) {
  const sentinelRef = useRef(null);

  // Infinite scroll — watch the sentinel div
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  const SORT_OPTIONS = [
    { value: 'match_score', label: '⚡ Best Match' },
    { value: 'newest', label: '🕐 Newest First' },
    { value: 'salary', label: '💰 Salary High–Low' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Feed header with count + sort */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
          {loading ? (
            <span style={{ color: '#64748b' }}>Searching...</span>
          ) : (
            <span>
              <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{total}</span> jobs found
            </span>
          )}
        </div>
        <select
          className="input-field"
          value={sortBy}
          onChange={e => onSortChange(e.target.value)}
          style={{ width: 'auto', fontSize: '12.5px', padding: '6px 10px' }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Skeleton loaders */}
      {loading && (
        <div style={{ display: 'grid', gap: '14px' }}>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Job cards grid */}
      {!loading && jobs.length > 0 && (
        <div style={{ display: 'grid', gap: '14px' }}>
          {jobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              onSave={onSave}
              onUnsave={onUnsave}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}

      {/* Load more sentinel */}
      {!loading && jobs.length > 0 && (
        <div ref={sentinelRef} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loadingMore && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
              <div style={{ width: '16px', height: '16px', border: '2px solid #334155', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Loading more jobs...
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          )}
          {!hasMore && jobs.length > 0 && (
            <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
              ✓ All {total} jobs loaded
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && jobs.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '64px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <Search size={48} style={{ opacity: 0.15, marginBottom: '8px' }} />
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px' }}>No jobs found</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px', maxWidth: '320px', lineHeight: '1.5' }}>
            Try broadening your search — remove some filters, change the keyword, or run a fresh job scan first.
          </p>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['React Developer', 'Python Backend', 'Data Analyst', 'Machine Learning'].map(kw => (
              <span key={kw} className="tag-skill" style={{ cursor: 'pointer' }}>{kw}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
