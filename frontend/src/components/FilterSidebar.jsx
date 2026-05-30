import React, { useState } from 'react';
import { SlidersHorizontal, X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

const WORK_TYPES = ['Remote', 'Hybrid', 'Onsite'];
const COMPANY_TYPES = ['Product-based', 'Service-based', 'Startup'];
const EXP_LEVELS = ['0-1 yrs', '2-3 yrs', '4-5 yrs', '5+ yrs'];

function SectionHeader({ label, open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'none', border: 'none', padding: '0', cursor: 'pointer',
        color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px', marginBottom: '10px',
      }}
    >
      {label}
      {open ? <ChevronUp size={15} style={{ color: '#64748b' }} /> : <ChevronDown size={15} style={{ color: '#64748b' }} />}
    </button>
  );
}

export default function FilterSidebar({ filters, onChange, onReset, isDrawer = false, onClose }) {
  const [openSections, setOpenSections] = useState({
    workType: true, experience: true, company: true, skills: true,
  });

  const toggle = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleChip = (field, value) => {
    const current = filters[field] || [];
    onChange({
      ...filters,
      [field]: current.includes(value) ? current.filter(v => v !== value) : [...current, value],
    });
  };

  const [skillInput, setSkillInput] = useState('');
  const addSkill = (sk) => {
    const trimmed = sk.trim();
    if (!trimmed) return;
    const current = filters.skills || [];
    if (!current.map(s => s.toLowerCase()).includes(trimmed.toLowerCase())) {
      onChange({ ...filters, skills: [...current, trimmed] });
    }
    setSkillInput('');
  };
  const removeSkill = (sk) => onChange({ ...filters, skills: (filters.skills || []).filter(s => s !== sk) });

  const chip = (active) => ({
    padding: '5px 12px', borderRadius: '20px', fontSize: '12.5px', fontWeight: '600',
    cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
    ...(active
      ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }
      : { background: 'transparent', color: '#64748b', borderColor: 'rgba(255,255,255,0.1)' }),
  });

  return (
    <div style={{
      background: isDrawer ? 'var(--card-bg)' : 'transparent',
      height: isDrawer ? '100%' : 'auto',
      overflowY: 'auto',
      padding: isDrawer ? '20px' : '0',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '15px' }}>
          <SlidersHorizontal size={16} style={{ color: 'var(--primary)' }} />
          Filters
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onReset} title="Reset all filters" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <RotateCcw size={13} /> Reset
          </button>
          {isDrawer && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Location */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>Location</label>
        <input
          className="input-field"
          placeholder="e.g. Bangalore, Remote..."
          value={filters.location || ''}
          onChange={e => onChange({ ...filters, location: e.target.value })}
          style={{ width: '100%', fontSize: '13px' }}
        />
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }} />

      {/* Work Type */}
      <div style={{ marginBottom: '20px' }}>
        <SectionHeader label="Work Type" open={openSections.workType} onToggle={() => toggle('workType')} />
        {openSections.workType && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {WORK_TYPES.map(wt => (
              <button key={wt} style={chip((filters.work_types || []).includes(wt))} onClick={() => toggleChip('work_types', wt)}>
                {wt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Experience Level */}
      <div style={{ marginBottom: '20px' }}>
        <SectionHeader label="Experience Level" open={openSections.experience} onToggle={() => toggle('experience')} />
        {openSections.experience && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {EXP_LEVELS.map(el => {
              const checked = (filters.experience_levels || []).includes(el);
              return (
                <label key={el} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: checked ? 'var(--text-primary)' : '#64748b' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChip('experience_levels', el)}
                    style={{ accentColor: 'var(--primary)', width: '14px', height: '14px' }}
                  />
                  {el}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Company Type */}
      <div style={{ marginBottom: '20px' }}>
        <SectionHeader label="Company Type" open={openSections.company} onToggle={() => toggle('company')} />
        {openSections.company && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {COMPANY_TYPES.map(ct => {
              const checked = (filters.company_types || []).includes(ct);
              return (
                <label key={ct} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: checked ? 'var(--text-primary)' : '#64748b' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChip('company_types', ct)}
                    style={{ accentColor: 'var(--primary)', width: '14px', height: '14px' }}
                  />
                  {ct}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Skills Tags */}
      <div style={{ marginBottom: '20px' }}>
        <SectionHeader label="Skills" open={openSections.skills} onToggle={() => toggle('skills')} />
        {openSections.skills && (
          <>
            <input
              className="input-field"
              placeholder="Type a skill and press Enter..."
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(skillInput); }
              }}
              style={{ width: '100%', fontSize: '12.5px', marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {(filters.skills || []).map(sk => (
                <span key={sk} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(2,132,199,0.12)', border: '1px solid rgba(2,132,199,0.3)', color: '#38bdf8', borderRadius: '6px', padding: '3px 8px', fontSize: '12px' }}>
                  {sk}
                  <button onClick={() => removeSkill(sk)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0, display: 'flex' }}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
