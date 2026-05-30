import React, { useState, useEffect } from 'react';
import { Lightbulb, Award, Code, Bookmark, BookmarkCheck, Search, PlayCircle, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';

const generateTempId = () => `temp-${Date.now()}`;

export default function LearningRecommendations({ backendUrl }) {
  const [missingSkillsStr, setMissingSkillsStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState({ youtube: [], courses: [], practice: [] });
  const [savedItems, setSavedItems] = useState([]);
  
  const [activeTab, setActiveTab] = useState("youtube");
  const [error, setError] = useState("");

  const fetchSavedItems = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/learning/saved`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSavedItems(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSavedItems();
  }, []);

  const handleRecommend = async () => {
    if (!missingSkillsStr.trim()) {
      setError("Please enter at least one skill.");
      return;
    }
    
    const skills = missingSkillsStr.split(",").map(s => s.trim()).filter(Boolean);
    
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/learning/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills }),
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch recommendations.");
      
      setResources(data.data);
      if (activeTab === "saved") setActiveTab("youtube");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (item, type) => {
    // Optimistic UI Update
    const tempId = generateTempId();
    const savedRecord = {
      id: tempId,
      skill: item.skill,
      resource_type: type,
      title: item.title,
      url: item.url,
      thumbnail_url: item.thumbnail,
      platform: item.platform,
      price_status: item.price_status || "Free",
      isTemp: true
    };
    
    setSavedItems(prev => [savedRecord, ...prev]);

    try {
      const res = await fetch(`${backendUrl}/api/learning/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill: item.skill,
          resource_type: type,
          title: item.title,
          url: item.url,
          thumbnail_url: item.thumbnail,
          platform: item.platform,
          price_status: item.price_status || "Free"
        }),
        credentials: "include"
      });
      
      if (res.ok) {
        fetchSavedItems(); // fetch actual ID
      }
    } catch (e) {
      // Revert optimistic update
      setSavedItems(prev => prev.filter(i => i.id !== tempId));
      alert("Failed to save resource.");
    }
  };

  const handleUnsave = async (id) => {
    // Optimistic UI
    const original = savedItems;
    setSavedItems(prev => prev.filter(i => i.id !== id));
    
    try {
      await fetch(`${backendUrl}/api/learning/saved/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
    } catch (e) {
      setSavedItems(original);
      alert("Failed to remove item.");
    }
  };

  const isSaved = (url) => {
    return savedItems.some(i => i.url === url);
  };

  const renderResourceCard = (item, type) => {
    const saved = isSaved(item.url);
    return (
      <div key={item.url} style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => {e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'}} onMouseLeave={e => {e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'}}>
        
        {type !== 'practice' && item.thumbnail && (
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#f1f5f9' }}>
            <img src={item.thumbnail} alt={item.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            {type === 'youtube' && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.9)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}>
                <PlayCircle color="white" size={28} />
              </a>
            )}
          </div>
        )}

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 'bold', background: 'rgba(2, 132, 199, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
              Skill: {item.skill}
            </span>
            <button 
              onClick={() => saved ? null : handleSave(item, type)}
              style={{ background: 'none', border: 'none', cursor: saved ? 'default' : 'pointer', color: saved ? '#10b981' : '#94a3b8' }}
              title={saved ? "Saved to Plan" : "Save to Learning Plan"}
            >
              {saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
            </button>
          </div>
          
          <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} className="hover-text-primary">
              {item.title}
            </a>
          </h4>

          {item.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: '1.5' }}>{item.description}</p>}
          
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
              {item.platform} {item.rating ? `• ⭐ ${item.rating}` : ''}
            </span>
            {item.price_status && (
              <span style={{ background: item.price_status === 'Free' ? '#dcfce7' : '#f1f5f9', color: item.price_status === 'Free' ? '#16a34a' : '#64748b', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                {item.price_status}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', margin: '0 0 8px 0' }}>
            <Lightbulb className="inline-icon" /> Smart Learning Recommendations
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
            Enter skills you want to learn. Our engine checks the cache and aggregates the best Free YouTube tutorials, Certifications, and Practice environments for you.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '500px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input
              className="input-field"
              placeholder="e.g. Docker, React, Machine Learning..."
              value={missingSkillsStr}
              onChange={e => setMissingSkillsStr(e.target.value)}
              style={{ paddingLeft: '40px', width: '100%' }}
              onKeyDown={e => e.key === 'Enter' && handleRecommend()}
            />
          </div>
          <button className="btn btn-primary" onClick={handleRecommend} disabled={loading} style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}>
            {loading ? <RefreshCw size={16} className="pulse-dot" /> : <Lightbulb size={16} />} Get Resources
          </button>
        </div>
        {error && <div style={{ color: '#dc2626', fontSize: '13px' }}>{error}</div>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', overflowX: 'auto' }}>
        <button className="tab-btn" onClick={() => setActiveTab("youtube")} style={activeTab === 'youtube' ? activeTabStyle : inactiveTabStyle}>
          <PlayCircle size={16} color={activeTab === 'youtube' ? '#ef4444' : 'currentColor'} /> YouTube Tutorials
        </button>
        <button className="tab-btn" onClick={() => setActiveTab("courses")} style={activeTab === 'courses' ? activeTabStyle : inactiveTabStyle}>
          <Award size={16} color={activeTab === 'courses' ? '#0ea5e9' : 'currentColor'} /> Courses & Certs
        </button>
        <button className="tab-btn" onClick={() => setActiveTab("practice")} style={activeTab === 'practice' ? activeTabStyle : inactiveTabStyle}>
          <Code size={16} color={activeTab === 'practice' ? '#8b5cf6' : 'currentColor'} /> Practice Platforms
        </button>
        <button className="tab-btn" onClick={() => setActiveTab("saved")} style={activeTab === 'saved' ? activeTabStyle : inactiveTabStyle}>
          <Bookmark size={16} color={activeTab === 'saved' ? '#10b981' : 'currentColor'} /> My Learning Plan ({savedItems.length})
        </button>
      </div>

      {/* Content Area */}
      <div style={{ minHeight: '400px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--primary)' }}>
            <RefreshCw size={36} className="pulse-dot" style={{ marginBottom: '16px' }} />
            <p style={{ fontWeight: '500' }}>Querying caching layer & fetching APIs...</p>
          </div>
        ) : (
          <>
            {activeTab === 'youtube' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {resources.youtube.length > 0 ? resources.youtube.map(r => renderResourceCard(r, 'youtube')) : <EmptyState msg="No YouTube videos fetched. Search for skills." />}
              </div>
            )}

            {activeTab === 'courses' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {resources.courses.length > 0 ? resources.courses.map(r => renderResourceCard(r, 'course')) : <EmptyState msg="No courses fetched." />}
              </div>
            )}

            {activeTab === 'practice' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {resources.practice.length > 0 ? resources.practice.map(r => renderResourceCard(r, 'practice')) : <EmptyState msg="No practice platforms fetched." />}
              </div>
            )}

            {activeTab === 'saved' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {savedItems.length > 0 ? savedItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', opacity: item.isTemp ? 0.6 : 1 }}>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '11px', color: '#10b981', textTransform: 'uppercase', fontWeight: 'bold', background: '#dcfce7', padding: '4px 8px', borderRadius: '4px' }}>
                          {item.resource_type} • {item.skill}
                        </span>
                        <button onClick={() => handleUnsave(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Remove from Plan">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} className="hover-text-primary">
                          {item.title}
                        </a>
                      </h4>
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>{item.platform}</span>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
                          Start Learning <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                )) : <EmptyState msg="Your Learning Plan is empty. Save some resources to track them here!" />}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

const EmptyState = ({ msg }) => (
  <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
    <Lightbulb size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
    <p style={{ margin: 0, fontWeight: '500' }}>{msg}</p>
  </div>
);

const activeTabStyle = {
  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--primary)',
  background: 'rgba(2, 132, 199, 0.08)', color: 'var(--primary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap'
};
const inactiveTabStyle = {
  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: '1px solid transparent',
  background: 'transparent', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap'
};
