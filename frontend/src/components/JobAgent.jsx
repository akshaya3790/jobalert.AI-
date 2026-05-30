import React, { useState, useEffect } from 'react';
import { Search, Briefcase, Calendar, MapPin, Check, Plus, AlertCircle, ArrowRight, X, Sparkles, Link, Save, Bookmark, CheckCircle, User } from 'lucide-react';

export default function JobAgent({ profile, backendUrl, setView, setSelectedJobForTailoring }) {
  const [keywords, setKeywords] = useState("");
  const [selectedBoards, setSelectedBoards] = useState(["remotive", "weworkremotely", "himalayas", "remoteok"]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeDrawerJob, setActiveDrawerJob] = useState(null);
  
  // Track sync state
  const [syncStatus, setSyncStatus] = useState("Saved");
  const [syncSuccess, setSyncSuccess] = useState("");

  const [availableBoards, setAvailableBoards] = useState([]);
  const [companyTypeFilter, setCompanyTypeFilter] = useState("All");
  const [isExclusive, setIsExclusive] = useState(false);
  const [applyPromptJob, setApplyPromptJob] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  
  const [estimatedSalary, setEstimatedSalary] = useState(null);
  const [estimatingSalary, setEstimatingSalary] = useState(false);
  
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState(null);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);

  const getXaiBreakdown = (job) => {
    if (job.xai_breakdown && job.xai_breakdown.length > 0) {
      return job.xai_breakdown;
    }
    
    // Fallback calculation in case of older job entries in the database
    const score = job.match_score || 70;
    return [
      { label: "Skills Match", score: Math.min(100, score + 5), weight: 35, reason: `Matches core skills mentioned in JD.` },
      { label: "Role Alignment", score: score >= 80 ? 100 : 70, weight: 25, reason: `Job title aligns with desired roles.` },
      { label: "Location Fit", score: score >= 60 ? 100 : 50, weight: 20, reason: `Matches preferred location options.` },
      { label: "Experience Level", score: Math.min(100, score + 10), weight: 10, reason: `Meets experience requirement.` },
      { label: "Work Type", score: score >= 85 ? 100 : 80, weight: 10, reason: `Work arrangement aligns with profile.` }
    ];
  };

  const fetchWebsites = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/websites`);
      if (res.ok) {
        const data = await res.json();
        setAvailableBoards(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/jobs/alerts?min_score=10`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setJobs(data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchWebsites();
    // Load previously scanned jobs on load if any
    fetchAlerts();
  }, []);

  // Initialize selectedRoles with all desired roles from profile on load
  useEffect(() => {
    if (profile && profile.desired_roles && profile.desired_roles.length > 0) {
      setSelectedRoles(profile.desired_roles);
    } else {
      setSelectedRoles([]);
    }
  }, [profile]);

  // Dynamically sync search keywords input with selectedRoles
  useEffect(() => {
    setKeywords(selectedRoles.join(", "));
  }, [selectedRoles]);

  const toggleBoard = (boardId) => {
    if (selectedBoards.includes(boardId)) {
      setSelectedBoards(selectedBoards.filter(b => b !== boardId));
    } else {
      setSelectedBoards([...selectedBoards, boardId]);
    }
  };

  const triggerScan = async () => {
    if (!profile || !profile.name) {
      setError("You must upload a resume before scanning for matches.");
      return;
    }
    if (!selectedRoles || selectedRoles.length === 0) {
      setError("Please select at least one role under 'Search your Desired Roles' to scan.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchKeywords = selectedRoles.join(" OR ");

      const response = await fetch(`${backendUrl}/api/jobs/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: searchKeywords,
          boards: selectedBoards
        })
      });

      if (!response.ok) {
        throw new Error("Failed to scan job boards. Check backend server logs.");
      }

      const data = await response.json();
      if (data.jobs && data.stats) {
        setJobs(data.jobs);
        
        // Uncheck failed boards
        const failedBoards = Object.keys(data.stats).filter(board => data.stats[board].error);
        if (failedBoards.length > 0) {
          setSelectedBoards(prev => prev.filter(b => !failedBoards.includes(b)));
        }
      } else {
        // Fallback for older format just in case
        setJobs(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEztrackrSync = async (jobId) => {
    try {
      const res = await fetch(`${backendUrl}/api/eztrackr/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          status: syncStatus
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSyncSuccess(data.message);
        // Update job item in local list
        setJobs(jobs.map(j => j.id === jobId ? { ...j, eztrackr_status: syncStatus } : j));
        if (activeDrawerJob && activeDrawerJob.id === jobId) {
          setActiveDrawerJob({ ...activeDrawerJob, eztrackr_status: syncStatus });
        }
      } else {
        throw new Error("Tracker synchronization failed.");
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEstimateSalary = async (job) => {
    setEstimatingSalary(true);
    try {
      const response = await fetch(`${backendUrl}/api/jobs/estimate-salary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: job.description })
      });
      if (!response.ok) throw new Error("Failed to estimate salary");
      const data = await response.json();
      setEstimatedSalary(data.estimated_salary);
    } catch (err) {
      console.error(err);
      setEstimatedSalary("Estimation unavailable");
    } finally {
      setEstimatingSalary(false);
    }
  };

  const handleGenerateCoverLetter = async (job) => {
    setGeneratingCoverLetter(true);
    setGeneratedCoverLetter(null);
    try {
      const response = await fetch(`${backendUrl}/api/jobs/cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_description: job.description, company_name: job.company })
      });
      if (!response.ok) throw new Error("Failed to generate cover letter");
      const data = await response.json();
      setGeneratedCoverLetter(data.cover_letter);
    } catch (err) {
      console.error(err);
      setGeneratedCoverLetter("Error generating cover letter. Please try again later.");
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const handleSaveJob = async (jobId) => {
    const job = jobs.find(j => j.id === jobId) || activeDrawerJob;
    if (!job) return;
    try {
      await fetch(`${backendUrl}/api/jobs/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job })
      });
      setSyncSuccess("Job saved to your CRM tracker!");
    } catch(e) {
      console.error(e);
    }
  };

  const handleApplyJob = async (jobId) => {
    const job = jobs.find(j => j.id === jobId) || activeDrawerJob;
    if (!job) return;
    try {
      await fetch(`${backendUrl}/api/jobs/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job })
      });
      setSyncSuccess("Job marked as Applied in your CRM!");
    } catch(e) {
      console.error(e);
    }
  };

  const sendToTailor = (job) => {
    setSelectedJobForTailoring({
      title: job.title,
      company: job.company,
      description: job.description
    });
  };

  const isJobTitleMatchingSelectedRole = (job) => {
    if (!selectedRoles || selectedRoles.length === 0) return false;
    const lowerTitle = job.title.toLowerCase();
    return selectedRoles.some(role => lowerTitle.includes(role.toLowerCase().trim()));
  };

  const baseJobs = jobs.filter(j => {
    if (!isJobTitleMatchingSelectedRole(j)) return false;
    if (isExclusive && (j.match_score || 70) < 70) return false;
    return true;
  });

  const countAll = baseJobs.length;
  const countProduct = baseJobs.filter(j => j.company_type === "Product-based").length;
  const countService = baseJobs.filter(j => j.company_type === "Service-based").length;
  const countStartup = baseJobs.filter(j => j.company_type === "Startup").length;

  const filteredJobs = companyTypeFilter === "All"
    ? baseJobs
    : baseJobs.filter(j => j.company_type === companyTypeFilter);

  return (
    <>
      {/* Robot Apply Prompt Modal */}
      {applyPromptJob && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'bounce 2s infinite' }}>🤖</div>
          <h2 style={{ marginBottom: '8px', fontSize: '28px', textAlign: 'center' }}>JobAgent.AI Auto-Apply</h2>
          <p style={{ marginBottom: '32px', color: 'rgba(255,255,255,0.7)' }}>Do you want me to apply for you to {applyPromptJob.company}?</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button onClick={() => { handleApplyJob(applyPromptJob.id); setApplyPromptJob(null); }} style={{ background: 'var(--primary)', color: 'white', padding: '12px 32px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)' }}>Yes, Apply Now</button>
            <button onClick={() => setApplyPromptJob(null)} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '12px 32px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>No, Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Search Console */}
      <div className="glass-card">
        <h3 className="card-title" style={{ marginBottom: '16px' }}>
          <Sparkles size={18} style={{ color: 'var(--primary)' }} />
          Configure Agent Search Parameters
        </h3>

        <div className="search-console">
          <div className="search-input-wrapper">
            <Search className="search-icon-inside" size={18} />
            <input 
              className="search-input" 
              placeholder="Select desired roles below to start scanning..."
              value={keywords} 
              readOnly
              style={{ cursor: 'default', backgroundColor: '#f8fafc', color: 'var(--text-primary)' }}
            />
          </div>
          <button className="btn btn-primary" onClick={triggerScan} disabled={loading}>
            {loading ? "Searching..." : "Scan Boards"}
          </button>
        </div>

        {/* Quick Preference Suggestion Chips */}
        {profile && profile.desired_roles && profile.desired_roles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Search your Desired Roles ({selectedRoles.length} selected):</span>
              <button
                onClick={() => {
                  if (selectedRoles.length === profile.desired_roles.length) {
                    setSelectedRoles([]);
                  } else {
                    setSelectedRoles(profile.desired_roles);
                  }
                }}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary)',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                {selectedRoles.length === profile.desired_roles.length ? 'Deselect All Roles' : 'Select All Roles'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {profile.desired_roles.map((role) => {
                const isSelected = selectedRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setSelectedRoles(prev => 
                        isSelected ? prev.filter(r => r !== role) : [...prev, role]
                      );
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '16px',
                      background: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                      color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: isSelected ? '600' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Website checklist */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Select Job Boards to Search ({selectedBoards.length} selected):
            </div>
            <button
              onClick={() => {
                if (selectedBoards.length === availableBoards.length) {
                  setSelectedBoards([]);
                } else {
                  setSelectedBoards(availableBoards.map(b => b.id));
                }
              }}
              style={{
                background: 'none', border: 'none', color: 'var(--primary)',
                fontSize: '12px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              {selectedBoards.length === availableBoards.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
            {availableBoards.map(board => (
              <label 
                key={board.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  padding: '6px 10px',
                  background: selectedBoards.includes(board.id) ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                  border: '1px solid',
                  borderColor: selectedBoards.includes(board.id) ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
                  borderRadius: '6px',
                  color: selectedBoards.includes(board.id) ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={selectedBoards.includes(board.id)} 
                  onChange={() => toggleBoard(board.id)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                {board.name}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--rose)', fontSize: '14px', marginTop: '16px', background: 'rgba(239, 68, 68, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>

      {/* Scanned Results */}
      <div className="glass-card">
        <div className="card-title-bar">
          <h3 className="card-title">
            <Briefcase size={18} />
            Scanned Postings ({jobs.length} found)
          </h3>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Sorted by AI Compatibility Score
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="pulse-dot" style={{ margin: '0 auto 16px', width: '12px', height: '12px', color: 'var(--primary)' }}></div>
            <div style={{ fontWeight: '600' }}>AI Agent scanning 20 directories...</div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Downloading feeds, scraping HTML lists, and running match-score evaluations
            </p>
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            <Briefcase size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontWeight: '500' }}>No search results loaded.</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Configure your search keywords above and launch a scan.</p>
          </div>
        ) : (
          <>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'All', label: 'All Jobs', count: countAll, bg: 'rgba(2, 132, 199, 0.06)', color: 'var(--primary)' },
                  { id: 'Product-based', label: 'Product-based', count: countProduct, bg: 'rgba(2, 132, 199, 0.08)', color: 'var(--primary)' },
                  { id: 'Service-based', label: 'Service-based', count: countService, bg: 'rgba(139, 92, 246, 0.08)', color: '#8b5cf6' },
                  { id: 'Startup', label: 'Startups', count: countStartup, bg: 'rgba(249, 115, 22, 0.08)', color: '#f97316' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setCompanyTypeFilter(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: '1px solid',
                      borderColor: companyTypeFilter === tab.id ? tab.color : 'rgba(0,0,0,0.05)',
                      background: companyTypeFilter === tab.id ? tab.bg : 'rgba(255,255,255,0.4)',
                      color: companyTypeFilter === tab.id ? tab.color : 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: companyTypeFilter === tab.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    {tab.label}
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      background: companyTypeFilter === tab.id ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0,0,0,0.05)',
                      color: companyTypeFilter === tab.id ? tab.color : 'var(--text-muted)'
                    }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setIsExclusive(!isExclusive)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: isExclusive ? 'var(--primary)' : 'transparent',
                  color: isExclusive ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${isExclusive ? 'var(--primary)' : 'var(--border-color)'}`,
                  padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease'
                }}
              >
                {isExclusive ? '✓ Exclusive Match' : 'Exclusive Match'}
              </button>
            </div>

            {filteredJobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                <p style={{ fontWeight: '500' }}>No {companyTypeFilter} jobs found.</p>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>Try switching to another tab or starting a new search scan.</p>
              </div>
            ) : (
              <div className="job-list">
                {filteredJobs.map((job, idx) => (
                  <div key={job.id || idx} className="job-item" onClick={() => setActiveDrawerJob(job)}>
                    <div className="job-info-left">
                      <div className="job-title-row">
                        <h4 className="job-title">{job.title}</h4>
                        <span className="badge badge-source">{job.source}</span>
                        {job.description && job.description.includes("This post was scraped and indexed") && (
                          <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                            Simulated Demo
                          </span>
                        )}
                        {job.company_type && (
                          <span className={`badge ${
                            job.company_type === 'Product-based' ? 'badge-product' : 
                            job.company_type === 'Service-based' ? 'badge-service' : 'badge-startup'
                          }`}>
                            {job.company_type}
                          </span>
                        )}
                        {job.used_persona && (
                          <span 
                            className="badge" 
                            title="This job was evaluated against your uploaded resume profile to calculate the compatibility score."
                            style={{ 
                              background: 'rgba(99, 102, 241, 0.1)', 
                              color: '#6366f1', 
                              border: '1px solid rgba(99, 102, 241, 0.2)', 
                              fontSize: '10px',
                              cursor: 'help'
                            }}
                          >
                            <User size={10} style={{ display: 'inline', marginRight: '4px' }}/> Resume Profile
                          </span>
                        )}
                        {job.eztrackr_status && (
                          <span className="badge" style={{ background: 'rgba(6, 180, 212, 0.1)', color: 'var(--cyan)', border: '1px solid rgba(6, 180, 212, 0.2)', fontSize: '10px' }}>
                            Tracked: {job.eztrackr_status}
                          </span>
                        )}
                      </div>
                      <div className="job-meta-row">
                        <span className="job-meta-item">
                          <strong>{job.company}</strong>
                        </span>
                        <span>•</span>
                        <span className="job-meta-item">
                          <MapPin size={12} /> {job.location || "Remote"}
                        </span>
                        <span>•</span>
                        <span className="job-meta-item">
                          <Calendar size={12} /> {job.posted_date || "Today"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: '6px', minWidth: '110px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className={`score-indicator ${
                          job.match_score >= 80 ? 'score-high' : job.match_score >= 60 ? 'score-mid' : 'score-low'
                        }`} style={{ fontSize: '13px', padding: '4px 8px', borderRadius: '6px' }}>
                          {job.match_score || 50}% Match
                        </div>
                        <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div style={{ width: '80px', height: '4px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '2px', overflow: 'hidden', marginRight: '24px' }}>
                        <div style={{ 
                          width: `${job.match_score || 50}%`, 
                          height: '100%', 
                          background: job.match_score >= 80 ? 'var(--emerald)' : job.match_score >= 60 ? 'var(--amber)' : 'var(--rose)',
                          borderRadius: '2px'
                        }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Side Drawer: Job Details & AI analysis */}
      {activeDrawerJob && (
        <div className="side-drawer-backdrop" onClick={() => setActiveDrawerJob(null)}>
          <div className="side-drawer" onClick={e => e.stopPropagation()}>
            
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <span className="badge badge-source">{activeDrawerJob.source}</span>
                  {activeDrawerJob.company_type && (
                    <span className={`badge ${
                      activeDrawerJob.company_type === 'Product-based' ? 'badge-product' : 
                      activeDrawerJob.company_type === 'Service-based' ? 'badge-service' : 'badge-startup'
                    }`}>
                      {activeDrawerJob.company_type}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '20px', margin: 0, fontFamily: 'var(--font-heading)' }}>{activeDrawerJob.title}</h2>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  at <strong>{activeDrawerJob.company}</strong> | {activeDrawerJob.location}
                </div>
              </div>
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                onClick={() => setActiveDrawerJob(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Explainable AI Match Score Panel */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px', 
              padding: '20px', 
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className={`score-indicator ${
                    activeDrawerJob.match_score >= 80 ? 'score-high' : activeDrawerJob.match_score >= 60 ? 'score-mid' : 'score-low'
                  }`} style={{ width: '64px', height: '64px', fontSize: '20px', fontWeight: 'bold' }}>
                    {activeDrawerJob.match_score}%
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Explainable Match Score</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Calculated from your career preferences & resume
                    </p>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Locally Computed
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

              {/* XAI Breakdown Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {getXaiBreakdown(activeDrawerJob).map((dim, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{dim.label}</span>
                      <span style={{ fontWeight: '600', color: dim.score >= 80 ? 'var(--emerald)' : dim.score >= 60 ? 'var(--amber)' : 'var(--rose)' }}>
                        {dim.score}% <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400' }}>({dim.weight}%)</span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${dim.score}%`, 
                        height: '100%', 
                        background: dim.score >= 80 ? 'var(--emerald)' : dim.score >= 60 ? 'var(--amber)' : 'var(--rose)',
                        borderRadius: '3px'
                      }}></div>
                    </div>
                    {/* Reason text */}
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', marginTop: '2px' }}>
                      {dim.reason}
                    </div>
                  </div>
                ))}
              </div>

              {/* Score Explanation summary box */}
              <div style={{ 
                marginTop: '8px', 
                padding: '12px', 
                background: 'rgba(139, 92, 246, 0.05)', 
                border: '1px solid rgba(139, 92, 246, 0.15)', 
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}>
                <strong style={{ color: 'var(--primary)' }}>Score Explained:</strong> Your final score of {activeDrawerJob.match_score}% is a weighted average where your skills match accounts for 35%, role alignment 25%, location fit 20%, experience level 10%, and work type preference 10%.
              </div>

              {/* AI Salary Estimator */}
              <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} /> AI Salary Estimator
                    </h4>
                    {estimatedSalary ? (
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{estimatedSalary}</div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Estimate market rate for this role</div>
                    )}
                  </div>
                  {!estimatedSalary && (
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--emerald)' }}
                      onClick={() => handleEstimateSalary(activeDrawerJob)}
                      disabled={estimatingSalary}
                    >
                      {estimatingSalary ? "Estimating..." : "Estimate Now"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" style={{ flexGrow: 1 }} onClick={() => setApplyPromptJob(activeDrawerJob)}>
                1-Click Agent Apply <ArrowRight size={16} />
              </button>
              <button className="btn btn-secondary" onClick={() => sendToTailor(activeDrawerJob)} title="Tailor Resume">
                Tailor Resume
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleGenerateCoverLetter(activeDrawerJob)} 
                title="Generate Cover Letter"
                disabled={generatingCoverLetter}
              >
                {generatingCoverLetter ? "Generating..." : "Gen Cover Letter"}
              </button>
              <button className="btn btn-secondary" onClick={() => handleSaveJob(activeDrawerJob.id)} title="Save for later">
                <Bookmark size={16} />
              </button>
              <a className="btn btn-secondary" href={activeDrawerJob.url} target="_blank" rel="noopener noreferrer" style={{ padding: '10px' }}>
                <Link size={16} />
              </a>
            </div>

            {/* Generated Cover Letter Section */}
            {generatedCoverLetter && (
              <div className="glass-card" style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.05)', borderColor: 'var(--primary)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} /> AI Generated Cover Letter
                  </h4>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCoverLetter);
                      alert("Copied to clipboard!");
                    }}
                  >
                    Copy
                  </button>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px' }}>
                  {generatedCoverLetter}
                </div>
              </div>
            )}

            {/* Eztrackr Sync Widget */}
            <div className="glass-card" style={{ padding: '16px', background: 'rgba(6, 180, 212, 0.03)', borderColor: 'rgba(6, 180, 212, 0.15)', marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Save size={14} /> Eztrackr Tracker Sync
              </h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  className="input-field" 
                  style={{ flexGrow: 1, padding: '6px 10px', fontSize: '13px' }}
                  value={syncStatus}
                  onChange={e => setSyncStatus(e.target.value)}
                >
                  <option value="Saved">Saved</option>
                  <option value="Applying">Applying</option>
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Offered">Offered</option>
                </select>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', borderColor: 'rgba(6, 180, 212, 0.3)', color: 'var(--cyan)' }} onClick={() => handleEztrackrSync(activeDrawerJob.id)}>
                  Sync
                </button>
              </div>
              {syncSuccess && (
                <div style={{ fontSize: '12px', color: 'var(--emerald)', marginTop: '8px', fontWeight: '500' }}>
                  {syncSuccess}
                </div>
              )}
            </div>

            {/* AI Matching Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Matching Skills */}
              <div>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Matching Skills</h4>
                <div className="tags-list">
                  {activeDrawerJob.matching_skills?.map((skill, i) => (
                    <span key={i} className="tag-skill" style={{ fontSize: '11px', padding: '2px 8px' }}>{skill}</span>
                  ))}
                  {(!activeDrawerJob.matching_skills || activeDrawerJob.matching_skills.length === 0) && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None identified</span>
                  )}
                </div>
              </div>

              {/* Missing Gaps */}
              <div>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Gaps & Missing Skills</h4>
                <div className="tags-list">
                  {activeDrawerJob.missing_skills?.map((skill, i) => (
                    <span key={i} className="tag-missing" style={{ fontSize: '11px', padding: '2px 8px' }}>{skill}</span>
                  ))}
                  {(!activeDrawerJob.missing_skills || activeDrawerJob.missing_skills.length === 0) && (
                    <span className="text-green" style={{ fontSize: '12px' }}>Perfect match! No key skill gaps.</span>
                  )}
                </div>
              </div>

              {/* Pros */}
              <div>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Pros (Why Apply)</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {activeDrawerJob.pros?.map((pro, i) => (
                    <li key={i}>{pro}</li>
                  ))}
                </ul>
              </div>

              {/* Cons */}
              <div>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Cons (Gaps)</h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {activeDrawerJob.cons?.map((con, i) => (
                    <li key={i}>{con}</li>
                  ))}
                </ul>
              </div>

              {/* JD description excerpt */}
              <div>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Full Job Description</h4>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                  {activeDrawerJob.description}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
    </>
  );
}
