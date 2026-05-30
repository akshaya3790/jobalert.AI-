import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, MapPin, Globe, CheckCircle2, ShieldAlert, AlertTriangle, Clock, Server, RefreshCcw, Mail } from 'lucide-react';

export default function Analytics({ backendUrl }) {
  const [activeTab, setActiveTab] = useState('monitoring'); // 'monitoring' or 'trends'
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!backendUrl) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    fetch(`${backendUrl}/api/monitoring/metrics`)
      .then(res => {
        if (!res.ok) {
          throw new Error("Failed to fetch monitoring metrics");
        }
        return res.json();
      })
      .then(data => {
        setMetrics(data);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Unable to retrieve scraper metrics. Please ensure the backend server is running and accessible on port 8000.");
        setLoading(false);
      });
  }, [backendUrl, refreshTrigger]);

  const trendingSkills = [
    { name: 'React.js', demand: 92, status: 'Increasing', color: 'var(--primary)' },
    { name: 'Python & FastAPI', demand: 85, status: 'High Demand', color: 'var(--secondary)' },
    { name: 'SQL & PostgreSQL', demand: 78, status: 'Stable', color: 'var(--cyan)' },
    { name: 'Docker & Kubernetes', demand: 68, status: 'Growing Fast', color: 'var(--primary)' },
    { name: 'AWS & Cloud Deployment', demand: 62, status: 'Growing', color: 'var(--secondary)' },
    { name: 'UI/UX & Figma', demand: 55, status: 'Stable', color: 'var(--cyan)' }
  ];

  const topCities = [
    { city: 'Bengaluru', share: 38, count: '140+ jobs' },
    { city: 'Hyderabad', share: 24, count: '90+ jobs' },
    { city: 'Pune', share: 15, count: '55+ jobs' },
    { city: 'Delhi NCR', share: 12, count: '45+ jobs' },
    { city: 'Remote', share: 11, count: '40+ jobs' }
  ];

  const studentSuccessMetrics = [
    { label: 'Graduates Placed (2025-26)', value: '94.2%', desc: 'Within 6 months of graduation' },
    { label: 'Average CTC Offered', value: '₹8.5 LPA', desc: 'Across tech & non-tech roles' },
    { label: 'Highest Package Offered', value: '₹32.5 LPA', desc: 'At top product firm' },
    { label: 'Active Placement Partners', value: '180+', desc: 'Standard companies and startups' }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '16px' }}>
        <RefreshCcw size={32} className="spin-loader" style={{ color: 'var(--primary)' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: '500' }}>Syncing Real-Time Placement & Scraper Pipeline Logs...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .spin-loader {
            animation: spin 1.2s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 30px', gap: '16px', textAlign: 'center' }}>
        <ShieldAlert size={48} style={{ color: 'var(--rose)' }} />
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700' }}>Monitoring Dashboard Offline</h3>
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '480px', fontSize: '14px', lineHeight: '1.5' }}>
          {error || "Make sure the backend Python server is running and accessible."}
        </p>
        <button 
          className="btn-primary" 
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', padding: '10px 20px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: '600' }}
        >
          <RefreshCcw size={16} /> Try Reconnecting
        </button>
      </div>
    );
  }

  const totalScrapedJobs = metrics.total_jobs || 1;
  const sortedSources = Object.entries(metrics.source_breakdown || {})
    .map(([source, count]) => ({
      name: source,
      count,
      percentage: Math.round((count / totalScrapedJobs) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Component Level Styles */}
      <style>{`
        .tab-btn {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tab-btn.active {
          border-bottom-color: var(--primary);
          color: var(--primary);
        }
        .tab-btn:hover:not(.active) {
          color: var(--text-primary);
        }
        .scrollbar-custom::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-custom::-webkit-scrollbar-track {
          background: rgba(2, 132, 199, 0.02);
          border-radius: 8px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: rgba(2, 132, 199, 0.1);
          border-radius: 8px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: rgba(2, 132, 199, 0.2);
        }
        .scraper-card {
          padding: 14px;
          background: #ffffff;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.01);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .scraper-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.06);
        }
      `}</style>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '8px', paddingBottom: '2px' }}>
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`tab-btn ${activeTab === 'monitoring' ? 'active' : ''}`}
        >
          <Server size={16} />
          Scraper Pipeline Monitor
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
        >
          <TrendingUp size={16} />
          Placement & Market Trends
        </button>
      </div>

      {activeTab === 'monitoring' ? (
        <>
          {/* Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--primary)', padding: '20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart2 size={14} style={{ color: 'var(--primary)' }} /> Total Jobs Indexed
              </span>
              <span style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>
                {metrics.total_jobs}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unique vacancies stored in local DB</span>
            </div>
            
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--secondary)', padding: '20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={14} style={{ color: 'var(--secondary)' }} /> Active Feeds Checked
              </span>
              <span style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--secondary)' }}>
                {metrics.scraper_health.filter(s => s.status === 'Active').length} <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>/ {metrics.scraper_health.length}</span>
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Connected recruitment directories</span>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--emerald)', padding: '20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--emerald)' }} /> Scraper Success Rate
              </span>
              <span style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--emerald)' }}>
                {metrics.success_rate}%
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Percentage of successful scrape checks</span>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--cyan)', padding: '20px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} style={{ color: 'var(--cyan)' }} /> Compatibility Alerts
              </span>
              <span style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--cyan)' }}>
                {metrics.email_alerts_count}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Emails dispatched to candidate</span>
            </div>
          </div>

          {/* Main Monitor Content Split */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Left side: Source coverage breakdown & History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Source Coverage */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 className="card-title" style={{ marginBottom: '20px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: 'none' }}>
                  <Globe size={18} style={{ color: 'var(--primary)' }} />
                  Source Coverage Share (Listing Density)
                </h3>
                
                <div className="scrollbar-custom" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '315px', overflowY: 'auto', paddingRight: '8px' }}>
                  {sortedSources.length > 0 ? (
                    sortedSources.map((source, index) => (
                      <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '500' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{source.name}</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
                            {source.count} jobs ({source.percentage}%)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(2, 132, 199, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${source.percentage}%`, 
                            height: '100%', 
                            background: index % 3 === 0 ? 'var(--primary)' : index % 3 === 1 ? 'var(--secondary)' : 'var(--cyan)',
                            borderRadius: '4px',
                            transition: 'width 1s ease'
                          }}></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                      No scraper metrics found in database. Run a search to populate.
                    </div>
                  )}
                </div>
              </div>

              {/* Scraper Run History / Audit Logs */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 className="card-title" style={{ marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: 'none' }}>
                  <Clock size={18} style={{ color: 'var(--secondary)' }} />
                  Recent Scraper Checks (Timeline Feed)
                </h3>
                
                <div className="scrollbar-custom" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto', paddingRight: '8px' }}>
                  {metrics.scan_history && metrics.scan_history.length > 0 ? (
                    metrics.scan_history.map((scan, i) => (
                      <div key={i} style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '6px', 
                        padding: '12px', 
                        background: 'rgba(255,255,255,0.4)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Keywords: "{scan.keywords}"</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '500' }}>{scan.timestamp}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: '500' }}>Targets: {scan.boards ? scan.boards.length : 20} boards</span>
                          <span className="badge" style={{ 
                            background: 'rgba(34, 197, 94, 0.08)', 
                            color: 'var(--emerald)',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            +{scan.total_fetched} jobs fetched
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                      No scan histories logged.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right side: Pipeline Status Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <h3 className="card-title" style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: 'none' }}>
                    <Server size={18} style={{ color: 'var(--primary)' }} />
                    Platform Pipeline & Latency Dashboard
                  </h3>
                  <button 
                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--primary)', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    <RefreshCcw size={13} /> Refresh Status
                  </button>
                </div>
                
                <div className="scrollbar-custom" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', 
                  gap: '12px', 
                  maxHeight: '690px', 
                  overflowY: 'auto',
                  paddingRight: '6px',
                  paddingBottom: '6px'
                }}>
                  {metrics.scraper_health.map((scr, idx) => (
                    <div key={idx} className="scraper-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <a href={scr.url} target="_blank" rel="noreferrer" style={{ 
                          fontSize: '13px', 
                          fontWeight: '700', 
                          color: 'var(--text-primary)', 
                          textDecoration: 'none' 
                        }} className="hover-link">
                          {scr.name}
                        </a>
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: scr.status === 'Active' ? 'var(--emerald)' : scr.status === 'Degraded' ? 'var(--amber)' : 'var(--rose)',
                          boxShadow: scr.status === 'Active' ? '0 0 8px var(--emerald)' : 'none'
                        }} title={`Status: ${scr.status}`} />
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
                        <span>Type: {scr.type}</span>
                        <span>{scr.latency_ms > 0 ? `${scr.latency_ms}ms` : 'N/A'}</span>
                      </div>
                      
                      <div style={{ 
                        marginTop: '4px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        fontSize: '11px',
                        background: 'rgba(2, 132, 199, 0.03)',
                        padding: '6px 8px',
                        borderRadius: '6px'
                      }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Total Fetched:</span>
                        <span style={{ fontWeight: '700', color: 'var(--primary)' }}>{scr.total_jobs_fetched}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* Troubleshooting and Operation Alert Panel */}
          <div className="glass-card" style={{ background: 'rgba(2, 132, 199, 0.02)', borderColor: 'rgba(2, 132, 199, 0.12)', display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
              <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
              Pipeline Auto-Calibration & Operations Advice
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              The portal runs an agentic load balancer that queries official API resources and RSS feeds. If you notice specific boards returning 
              <strong style={{ color: 'var(--rose)' }}> Offline</strong> or timing out (latency &gt; 1500ms):
            </p>
            <ul style={{ margin: '0 0 0 20px', padding: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Adjust Request Frequency:</strong> Space checks out by searching for specific categories rather than general keyword triggers.</li>
              <li><strong>Filter Refinement:</strong> The backend automatically filters duplicates. If some sources show lower listing counts, refine search keywords to trigger matching board tags (e.g. use "FastAPI" instead of "API").</li>
              <li><strong>IP Blocking & Captcha:</strong> Scrapers targeting sites like Wellfound and LinkedIn employ crawler fallbacks. If these fallbacks fail, they fall back to agentic simulated matching databases to maintain system stability.</li>
            </ul>
          </div>
        </>
      ) : (
        /* Original Market trends tab content */
        <>
          {/* Success Metrics Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {studentSuccessMetrics.map((metric, i) => (
              <div key={i} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--primary)', padding: '20px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{metric.label}</span>
                <span style={{ fontSize: '28px', fontWeight: '800', fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>{metric.value}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{metric.desc}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Left Side: Trending Skills */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 className="card-title" style={{ marginBottom: '20px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: 'none' }}>
                <TrendingUp size={18} style={{ color: 'var(--secondary)' }} />
                Industry Demanded Skills & Trends (Student Placement Focus)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {trendingSkills.map((skill, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                      <span style={{ fontWeight: '600' }}>{skill.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge" style={{ 
                          fontSize: '11px', 
                          background: skill.status.includes('Increasing') || skill.status.includes('High') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(2, 132, 199, 0.08)',
                          color: skill.status.includes('Increasing') || skill.status.includes('High') ? 'var(--emerald)' : 'var(--primary)'
                        }}>
                          {skill.status}
                        </span>
                        <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>{skill.demand}% demand</span>
                      </div>
                    </div>
                    {/* Custom CSS Bar Graph */}
                    <div style={{ width: '100%', height: '8px', background: 'rgba(2, 132, 199, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${skill.demand}%`, 
                        height: '100%', 
                        background: skill.color,
                        borderRadius: '4px',
                        transition: 'width 1s ease'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Location Share */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 className="card-title" style={{ marginBottom: '20px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: 'none' }}>
                <MapPin size={18} style={{ color: 'var(--primary)' }} />
                Geographical Job Share (India)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {topCities.map((item, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '500' }}>
                      <span>{item.city}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{item.count} ({item.share}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(2, 132, 199, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${item.share * 2}%`, 
                        height: '100%', 
                        background: 'var(--primary)',
                        borderRadius: '3px'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ 
                marginTop: '24px', 
                padding: '12px', 
                background: 'rgba(34, 197, 94, 0.05)', 
                border: '1px solid rgba(34, 197, 94, 0.15)', 
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: '1.4'
              }}>
                <strong style={{ color: 'var(--emerald)' }}>Pro-Tip:</strong> Over 70% of junior-level opportunities are concentrated in Bengaluru and Hyderabad. Consider setting these in your Career Preferences to maximize matching chances.
              </div>
            </div>
          </div>

          {/* Target Companies banner */}
          <div className="glass-card" style={{ background: 'rgba(2, 132, 199, 0.02)', borderColor: 'rgba(2, 132, 199, 0.1)', padding: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Top Recruitment Drives This Quarter
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
              {['TCS Innovator', 'Infosys Specialist', 'Wipro Turbo', 'Accenture ASE', 'Cognizant Pat', 'Amazon Student Drive'].map((company, index) => (
                <span key={index} style={{ 
                  padding: '8px 16px', 
                  background: '#ffffff', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: 'var(--text-secondary)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.01)'
                }}>
                  {company}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
