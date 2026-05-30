import React, { useState, useEffect } from 'react';
import { Globe, ArrowUpRight, Search, Play } from 'lucide-react';

export default function WebsiteIndex({ backendUrl, setView }) {
  const [websites, setWebsites] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchWebsites = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/websites`);
      if (res.ok) {
        const data = await res.json();
        setWebsites(data);
      }
    } catch (e) {
      console.error("Error loading websites:", e);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  const filteredWebsites = websites.filter(site => 
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Website search and stats */}
      <div className="glass-card">
        <div className="card-title-bar" style={{ marginBottom: '12px' }}>
          <h3 className="card-title">
            <Globe size={18} />
            Job Directory Index
          </h3>
          <span className="badge badge-source" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)' }}>
            20 Platforms Standardized
          </span>
        </div>
        
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          This index shows all 20 standard websites mapped and utilized by the Job Alerting Agent. The agent scans APIs, parsers, and custom web crawlers concurrently to fetch listings.
        </p>

        <div className="search-input-wrapper">
          <Search className="search-icon-inside" size={18} />
          <input 
            className="search-input" 
            placeholder="Search platforms by name, integration type, or URL..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of websites */}
      <div className="website-index-grid">
        {filteredWebsites.map((site) => (
          <div key={site.id} className="website-card">
            
            <div className="website-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="website-logo-badge">
                  {site.name.charAt(0)}
                </div>
                <h4 className="website-name">{site.name}</h4>
              </div>
              <span className="website-status">Active</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Integration:</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{site.type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{site.id === 'eztrackr' ? 'Application Tracker' : 'Job Board'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <a 
                href={site.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-secondary" 
                style={{ flexGrow: 1, padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                Visit Site <ArrowUpRight size={12} />
              </a>
              {site.id !== 'eztrackr' && (
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 8px', borderColor: 'rgba(139, 92, 246, 0.3)', color: 'var(--primary)' }}
                  onClick={() => setView('jobs')}
                  title="Search this platform"
                >
                  <Play size={12} fill="currentColor" />
                </button>
              )}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
