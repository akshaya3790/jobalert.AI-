import React, { useState, useEffect } from 'react';
import { Briefcase, FileText, Bell, Globe, ArrowRight, ShieldCheck, HelpCircle, ChevronDown, ChevronUp, Calendar, MapPin } from 'lucide-react';

export default function Dashboard({ profile, setView, backendUrl }) {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    totalScanned: 0,
    highMatches: 0,
    avgScore: 0
  });

  // Tab state for left column (alerts)
  const [activeAlertsTab, setActiveAlertsTab] = useState('top'); // 'top' or 'all'
  // Accordion state for job items
  const [expandedJobId, setExpandedJobId] = useState(null);
  // Tab state for right column (Candidate Console)
  const [activeConsoleTab, setActiveConsoleTab] = useState('profile'); // 'profile' or 'guide'

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/jobs/alerts?min_score=70`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
        
        // Calculate basic stats
        if (data.length > 0) {
          const scores = data.map(j => j.match_score || 0);
          const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
          setStats({
            totalScanned: data.length * 2, // approximation for demo
            highMatches: data.filter(j => j.match_score >= 80).length,
            avgScore: avg
          });
        }
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [profile]);

  const hasResume = profile && profile.name;

  // Filter alerts based on active tab
  const filteredAlerts = activeAlertsTab === 'top'
    ? alerts.filter(j => (j.match_score || 0) >= 80)
    : alerts;

  const toggleExpandJob = (e, jobId) => {
    e.stopPropagation(); // Avoid triggering card click
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Welcome Banner */}
      <div className="alert-banner" style={{ margin: 0, padding: '16px 24px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '22px', fontWeight: '700' }}>
            {hasResume ? `Welcome back, ${profile.name}!` : "Get Started with Job Alerting AI"}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', marginTop: '4px', lineHeight: '1.4' }}>
            {hasResume 
              ? `Your resume is active with ${profile.skills?.length || 0} skills. Let's find your matching remote role!` 
              : "Upload your resume first to unlock AI-powered job matching and tailoring recommendations."}
          </p>
        </div>
        {hasResume ? (
          <button className="btn btn-primary" onClick={() => setView('jobs')} style={{ background: '#fff', color: 'var(--primary)', padding: '8px 16px', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            Scan Jobs <ArrowRight size={14} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setView('resume')} style={{ background: '#fff', color: 'var(--primary)', padding: '8px 16px', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            Upload Resume <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(2, 132, 199, 0.08)', color: 'var(--primary)', borderRadius: '8px' }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Resume Status</div>
            <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px', color: 'var(--text-primary)' }}>
              {hasResume ? "Parsed & Active" : "Missing"}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(34, 197, 94, 0.08)', color: 'var(--secondary)', borderRadius: '8px' }}>
            <Bell size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Job Alerts</div>
            <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px', color: 'var(--text-primary)' }}>
              {alerts.length} Match Alerts
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(8, 145, 178, 0.08)', color: 'var(--cyan)', borderRadius: '8px' }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Average Fit Score</div>
            <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px', color: 'var(--text-primary)' }}>
              {stats.avgScore}% Match
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <div style={{ padding: '10px', background: 'rgba(22, 163, 74, 0.08)', color: 'var(--emerald)', borderRadius: '8px' }}>
            <Globe size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Boards Monitored</div>
            <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px', color: 'var(--text-primary)' }}>20 Platforms</div>
          </div>
        </div>

      </div>

      {/* Main Dashboard Layout */}
      <div className="dashboard-grid">
        
        {/* Left Column: Top Alerts */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
          <div className="card-title-bar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title" style={{ gap: '8px' }}>
                <Bell size={18} className="text-green" />
                Compatibility Alerts
              </h3>
              {filteredAlerts.length > 0 && (
                <span className="badge badge-source" style={{ padding: '2px 8px', fontSize: '11px' }}>{filteredAlerts.length} shown</span>
              )}
            </div>

            {/* Custom Tab Bar for Alerts */}
            <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
              <button
                onClick={() => setActiveAlertsTab('top')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: activeAlertsTab === 'top' ? '#fff' : 'transparent',
                  color: activeAlertsTab === 'top' ? 'var(--primary)' : 'var(--text-secondary)',
                  boxShadow: activeAlertsTab === 'top' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Top Matches (≥80%)
              </button>
              <button
                onClick={() => setActiveAlertsTab('all')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  background: activeAlertsTab === 'all' ? '#fff' : 'transparent',
                  color: activeAlertsTab === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
                  boxShadow: activeAlertsTab === 'all' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                All Matches (≥70%)
              </button>
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
              <Bell size={36} style={{ margin: '0 auto 12px', opacity: 0.3, color: 'var(--primary)' }} />
              <p style={{ fontWeight: '600', fontSize: '15px', margin: 0 }}>No compatibility alerts found.</p>
              <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-muted)' }}>
                {hasResume 
                  ? "Run a scan in the Job Finder tab to load remote listings that match your roles." 
                  : "Upload your resume first to activate compatibility evaluation."}
              </p>
            </div>
          ) : (
            <div className="job-list" style={{ gap: '8px' }}>
              {filteredAlerts.slice(0, 6).map((job) => {
                const isExpanded = expandedJobId === job.id || expandedJobId === job.url;
                const uniqueId = job.id || job.url;
                
                return (
                  <div 
                    key={uniqueId} 
                    className="job-item" 
                    onClick={(e) => toggleExpandJob(e, uniqueId)}
                    style={{ 
                      flexDirection: 'column', 
                      alignItems: 'stretch', 
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: isExpanded ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      boxShadow: isExpanded ? '0 3px 10px rgba(2, 132, 199, 0.05)' : '0 2px 8px rgba(0, 0, 0, 0.01)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Collapsed Header view */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', width: '100%' }}>
                      <div className="job-info-left" style={{ maxWidth: '75%', gap: '4px', overflow: 'hidden' }}>
                        <div className="job-title-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', overflow: 'hidden' }}>
                          <h4 className="job-title" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>{job.title}</h4>
                          <span className="badge badge-source" style={{ fontSize: '11px', padding: '1px 6px', flexShrink: 0 }}>{job.source}</span>
                          {job.company_type && (
                            <span className={`badge ${
                              job.company_type === 'Product-based' ? 'badge-product' : 
                              job.company_type === 'Service-based' ? 'badge-service' : 'badge-startup'
                            }`} style={{ fontSize: '11px', padding: '1px 6px', flexShrink: 0 }}>
                              {job.company_type}
                            </span>
                          )}
                        </div>
                        <div className="job-meta-row" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700' }}>{job.company}</span>
                          <span>•</span>
                          <span>{job.location || 'Remote'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <div className={`score-indicator ${
                          job.match_score >= 80 ? 'score-high' : 'score-mid'
                        }`} style={{ width: '42px', height: '42px', fontSize: '12px' }}>
                          {job.match_score}%
                        </div>
                        <button 
                          onClick={(e) => toggleExpandJob(e, uniqueId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Accordion Expanded Content */}
                    {isExpanded && (
                      <div style={{ 
                        marginTop: '10px', 
                        paddingTop: '10px', 
                        borderTop: '1px dashed var(--border-color)',
                        animation: 'fadeIn 0.2s ease-in-out'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Posted Date</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} /> {job.posted_date || 'Today'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Job Location</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} /> {job.location || 'Remote'}
                            </span>
                          </div>
                        </div>

                        {job.description && (
                          <div style={{ marginBottom: '12px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Job Snippet</span>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {job.description.replace(/\[Apply directly[\s\S]*\]/, '')}
                            </p>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setView('jobs');
                            }}
                          >
                            Explore in Finder
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredAlerts.length > 6 && (
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', padding: '8px', fontSize: '13px', fontWeight: '600', marginTop: '4px' }}
                  onClick={() => setView('jobs')}
                >
                  View All Alerts ({filteredAlerts.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Unified candidate console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '260px', flexShrink: 0 }}>
          
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', padding: '16px', boxSizing: 'border-box' }}>
            {/* Console Header Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', gap: '12px' }}>
              <button
                onClick={() => setActiveConsoleTab('profile')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeConsoleTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent',
                  paddingBottom: '4px',
                  color: activeConsoleTab === 'profile' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveConsoleTab('guide')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeConsoleTab === 'guide' ? '2px solid var(--primary)' : '2px solid transparent',
                  paddingBottom: '4px',
                  color: activeConsoleTab === 'guide' ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Guide
              </button>
            </div>
            
            {/* Tab 1: Profile View */}
            {activeConsoleTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease-in-out' }}>
                {hasResume ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Candidate Name</div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{profile.name}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Contact Email</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all' }}>{profile.email}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Key Skills ({profile.skills?.length})</div>
                      <div className="tags-list" style={{ marginTop: '6px', gap: '4px' }}>
                        {profile.skills?.slice(0, 6).map((skill, i) => (
                          <span key={i} className="tag-skill" style={{ fontSize: '11px', padding: '2px 6px' }}>{skill}</span>
                        ))}
                        {profile.skills?.length > 6 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center', fontWeight: '600' }}>
                            +{profile.skills.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ width: '100%', fontSize: '12px', fontWeight: '600', padding: '8px', marginTop: '4px' }}
                      onClick={() => setView('resume')}
                    >
                      Manage Resume
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)' }}>
                    <ShieldCheck size={32} style={{ margin: '0 auto 8px', opacity: 0.3, color: 'var(--primary)' }} />
                    <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>Resume profile not configured.</p>
                    <button className="btn btn-primary" style={{ width: '100%', padding: '8px', fontSize: '13px' }} onClick={() => setView('resume')}>
                      Setup Resume
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Quick Start Guide */}
            {activeConsoleTab === 'guide' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.2s ease-in-out' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px' }}>1.</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong>Resume Parser:</strong> Upload your CV to extract key skills.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px' }}>2.</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong>Job Finder:</strong> Query standard platforms simultaneously.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px' }}>3.</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong>Resume Tailoring:</strong> Paste Job Description to verify skills.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '13px' }}>4.</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <strong>Tracker Integration:</strong> Sync Application stages with Eztrackr.
                  </div>
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', fontSize: '12px', fontWeight: '600', padding: '8px', marginTop: '4px' }}
                  onClick={() => setView('guide')}
                >
                  View Prep Guide
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
