import React, { useState, useEffect, useMemo } from 'react';
import { Briefcase, Building, Calendar, Edit3, Trash2, Plus, ExternalLink, Save, Search, TrendingUp, XCircle, CheckCircle, BarChart2 } from 'lucide-react';

export default function Applications({ backendUrl }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  const statusOptions = ['Saved', 'Applied', 'Assessment', 'Interview', 'Rejected', 'Offer'];

  const getStatusColor = (status) => {
    switch(status) {
      case 'Saved': return { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
      case 'Applied': return { bg: '#e0f2fe', color: '#0284c7', border: '#bae6fd' };
      case 'Assessment': return { bg: '#f3e8ff', color: '#9333ea', border: '#e9d5ff' };
      case 'Interview': return { bg: '#fef9c3', color: '#ca8a04', border: '#fef08a' };
      case 'Offer': return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
      case 'Rejected': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      default: return { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/applications`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.data || []);
      }
    } catch (e) {
      setError("Failed to load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const isNew = !editingApp.id;
      const url = isNew ? `${backendUrl}/api/applications` : `${backendUrl}/api/applications/${editingApp.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingApp),
        credentials: 'include'
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchApplications(); // Refresh list to get real ID and updated timestamps
      }
    } catch (e) {
      alert("Failed to save application");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tracked application?")) return;
    try {
      await fetch(`${backendUrl}/api/applications/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      setApplications(prev => prev.filter(app => app.id !== id));
    } catch (e) {
      alert("Failed to delete.");
    }
  };

  const quickUpdateStatus = async (id, newStatus) => {
    // Optimistic UI update
    setApplications(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
    
    // Background sync
    const appToUpdate = applications.find(a => a.id === id);
    if (!appToUpdate) return;
    
    try {
      await fetch(`${backendUrl}/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...appToUpdate, status: newStatus }),
        credentials: 'include'
      });
    } catch (e) {
      // Revert if failed
      fetchApplications();
    }
  };

  // --- Derived Analytics ---
  const metrics = useMemo(() => {
    const total = applications.length;
    const applied = applications.filter(a => ['Applied', 'Assessment', 'Interview', 'Offer', 'Rejected'].includes(a.status)).length;
    const interviews = applications.filter(a => a.status === 'Interview').length;
    const offers = applications.filter(a => a.status === 'Offer').length;
    const rejections = applications.filter(a => a.status === 'Rejected').length;
    
    const interviewRate = applied > 0 ? Math.round((interviews / applied) * 100) : 0;
    
    return { total, applied, interviews, offers, rejections, interviewRate };
  }, [applications]);

  const filteredApps = applications.filter(app => 
    (app.company || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (app.job_title || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Dashboard Top Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', borderLeft: '4px solid var(--primary)' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Briefcase size={14} /> Total Applied
          </span>
          <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '8px' }}>{metrics.applied}</span>
        </div>
        
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', borderLeft: '4px solid #ca8a04' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} /> Interviews
          </span>
          <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '8px' }}>{metrics.interviews}</span>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', borderLeft: '4px solid #16a34a' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} /> Offers
          </span>
          <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '8px' }}>{metrics.offers}</span>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', borderLeft: '4px solid #dc2626' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <XCircle size={14} /> Rejections
          </span>
          <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '8px' }}>{metrics.rejections}</span>
        </div>
        
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', color: 'white' }}>
          <span style={{ fontSize: '13px', opacity: 0.9, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} /> Interview Rate
          </span>
          <span style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{metrics.interviewRate}%</span>
        </div>
      </div>

      {/* Main Tracker Area */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={20} color="var(--primary)"/> Application Pipeline
          </h2>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
              <input 
                type="text"
                placeholder="Search company or role..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '36px', width: '250px' }}
              />
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setEditingApp({ company: '', job_title: '', status: 'Saved', job_url: '', notes: '' });
                setShowModal(true);
              }}
            >
              <Plus size={16} /> Track New Job
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto', padding: '0 24px 24px 24px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading pipeline...</div>
          ) : filteredApps.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
              <Briefcase size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              <p>No applications found. Click "Track New Job" to start building your pipeline.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px', fontWeight: '600' }}>Company</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600' }}>Role</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600' }}>Date Applied</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map(app => {
                  const colors = getStatusColor(app.status);
                  return (
                    <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px 8px' }}>
                        <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Building size={14} color="#64748b" /> {app.company}
                        </div>
                      </td>
                      <td style={{ padding: '16px 8px', color: '#475569' }}>
                        {app.job_title}
                        {app.job_url && (
                          <a href={app.job_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: 'var(--primary)' }}>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </td>
                      <td style={{ padding: '16px 8px', color: '#64748b' }}>
                        {app.date_applied ? new Date(app.date_applied).toLocaleDateString() : '--'}
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <select 
                          value={app.status}
                          onChange={(e) => quickUpdateStatus(app.id, e.target.value)}
                          style={{
                            background: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
                            padding: '4px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '600',
                            outline: 'none', cursor: 'pointer', appearance: 'none', minWidth: '100px', textAlign: 'center'
                          }}
                        >
                          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px', marginRight: '8px' }} onClick={() => { setEditingApp(app); setShowModal(true); }}>
                          <Edit3 size={14} />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '6px', color: '#dc2626' }} onClick={() => handleDelete(app.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Edit Modal */}
      {showModal && editingApp && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0 }}>{editingApp.id ? 'Edit Application' : 'Track New Application'}</h3>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Company *</label>
                  <input required className="input-field" value={editingApp.company} onChange={e => setEditingApp({...editingApp, company: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Job Title *</label>
                  <input required className="input-field" value={editingApp.job_title} onChange={e => setEditingApp({...editingApp, job_title: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="form-label">Job URL</label>
                <input className="input-field" value={editingApp.job_url || ''} onChange={e => setEditingApp({...editingApp, job_url: e.target.value})} placeholder="https://..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Pipeline Status</label>
                  <select className="input-field" value={editingApp.status} onChange={e => setEditingApp({...editingApp, status: e.target.value})}>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Date Applied</label>
                  <input type="date" className="input-field" value={editingApp.date_applied ? editingApp.date_applied.split('T')[0] : ''} onChange={e => setEditingApp({...editingApp, date_applied: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="form-label">Custom Notes (Interview details, prep, etc.)</label>
                <textarea className="input-field" rows={4} value={editingApp.notes || ''} onChange={e => setEditingApp({...editingApp, notes: e.target.value})} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Save size={16}/> Save Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
