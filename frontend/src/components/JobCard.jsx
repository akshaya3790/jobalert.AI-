import React, { useState } from 'react';
import { MapPin, Bookmark, BookmarkCheck, ExternalLink, Briefcase, TrendingUp, Star } from 'lucide-react';

const WORK_TYPE_COLORS = {
  Remote: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  Hybrid: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  Onsite: { bg: 'rgba(99,102,241,0.12)', color: '#6366f1', border: 'rgba(99,102,241,0.3)' },
};

const SCORE_COLOR = (score) => {
  if (score >= 80) return '#10b981';
  if (score >= 55) return '#f59e0b';
  return '#ef4444';
};

export default function JobCard({ job, onSave, onUnsave, onViewDetails }) {
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(job.is_saved || false);

  const wtStyle = WORK_TYPE_COLORS[job.work_type] || WORK_TYPE_COLORS.Onsite;
  const scoreColor = SCORE_COLOR(job.match_score || 0);

  const handleBookmark = async (e) => {
    e.stopPropagation();
    setSaving(true);
    // Optimistic update
    const wasSaved = isSaved;
    setIsSaved(!wasSaved);
    try {
      if (wasSaved) {
        await onUnsave(job.id);
      } else {
        await onSave(job.id);
      }
    } catch {
      // Revert on error
      setIsSaved(wasSaved);
    } finally {
      setSaving(false);
    }
  };

  const companyInitial = (job.company || '?').charAt(0).toUpperCase();
  const descSnippet = (job.description || '').slice(0, 160).trim();
  const hasScore = job.match_score != null && job.match_score > 0;

  return (
    <div
      className="glass-card"
      onClick={() => onViewDetails && onViewDetails(job)}
      style={{
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.22s ease',
        borderLeft: `3px solid ${scoreColor}40`,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(2,132,199,0.12)';
        e.currentTarget.style.borderLeftColor = scoreColor;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderLeftColor = `${scoreColor}40`;
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px' }}>
        {/* Company logo badge */}
        <div style={{
          width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
          background: `linear-gradient(135deg, hsl(${companyInitial.charCodeAt(0) * 5 % 360}, 60%, 50%), hsl(${companyInitial.charCodeAt(0) * 7 % 360}, 70%, 40%))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-1px',
        }}>
          {companyInitial}
        </div>

        {/* Title & company */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {job.title}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
            {job.company || 'Unknown Company'}
            {job.source && <span style={{ color: '#475569', fontWeight: '400' }}> · {job.source}</span>}
          </div>
        </div>

        {/* Match score ring */}
        {hasScore && (
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '50%',
              border: `3px solid ${scoreColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '800', color: scoreColor,
              background: `${scoreColor}10`,
            }}>
              {job.match_score}%
            </div>
          </div>
        )}
      </div>

      {/* Chips row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
        {job.location && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: '6px', padding: '3px 8px', fontSize: '12px' }}>
            <MapPin size={11} /> {job.location}
          </span>
        )}
        {job.work_type && (
          <span style={{ background: wtStyle.bg, border: `1px solid ${wtStyle.border}`, color: wtStyle.color, borderRadius: '6px', padding: '3px 8px', fontSize: '12px', fontWeight: '600' }}>
            {job.work_type}
          </span>
        )}
        {job.experience_level && job.experience_level !== 'Not Specified' && (
          <span style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: '6px', padding: '3px 8px', fontSize: '12px' }}>
            {job.experience_level}
          </span>
        )}
        {job.salary && (
          <span style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', borderRadius: '6px', padding: '3px 8px', fontSize: '12px', fontWeight: '600' }}>
            {job.salary}
          </span>
        )}
      </div>

      {/* Description snippet */}
      {descSnippet && (
        <p style={{ fontSize: '12.5px', color: '#64748b', lineHeight: '1.5', margin: '0 0 12px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {descSnippet}{job.description?.length > 160 ? '…' : ''}
        </p>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '4px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(job.skills_required || []).slice(0, 3).map(sk => (
            <span key={sk} className="tag-skill" style={{ fontSize: '10.5px', padding: '2px 7px' }}>{sk}</span>
          ))}
          {(job.skills_required || []).length > 3 && (
            <span style={{ fontSize: '11px', color: '#64748b' }}>+{job.skills_required.length - 3}</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}
          >
            Apply <ExternalLink size={11} />
          </a>
          <button
            onClick={handleBookmark}
            disabled={saving}
            title={isSaved ? 'Remove bookmark' : 'Save job'}
            style={{
              background: isSaved ? 'rgba(2,132,199,0.12)' : 'transparent',
              border: `1px solid ${isSaved ? 'rgba(2,132,199,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px', padding: '5px 7px', cursor: saving ? 'wait' : 'pointer',
              color: isSaved ? '#38bdf8' : '#64748b', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center',
            }}
          >
            {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
