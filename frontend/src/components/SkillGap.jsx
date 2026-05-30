import React, { useState } from 'react';
import { BookOpen, AlertTriangle, CheckCircle, XCircle, Search, Terminal, PlayCircle } from 'lucide-react';

export default function SkillGap({ profile, backendUrl }) {
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!profile) {
      setError("Please ensure your resume profile is loaded first.");
      return;
    }
    if (!jdText.trim()) {
      setError("Please paste a Job Description to analyze.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const res = await fetch(`${backendUrl}/api/skill-gap/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_json: profile, jd_text: jdText }),
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Analysis failed.");

      setAnalysis(data.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', margin: '0 0 8px 0' }}>
          <BookOpen className="inline-icon" /> Skill Gap Analysis & Recommendations
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
          Semantically match your profile against a Job Description. Discover critical gaps, fetch free learning resources, and generate custom portfolio projects to learn them.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Input Panel */}
        <div className="glass-card" style={{ flex: '1 1 35%', minWidth: '320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="form-label">Target Job Description</label>
            <textarea
              className="input-field"
              rows={8}
              placeholder="Paste the target JD here..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              style={{ width: '100%', marginTop: '6px', fontSize: '13px' }}
            />
          </div>

          {error && <div style={{ color: '#dc2626', fontSize: '13px', background: '#fef2f2', padding: '8px', borderRadius: '4px' }}>{error}</div>}

          <button 
            className="btn btn-primary" 
            onClick={handleAnalyze} 
            disabled={loading || !jdText.trim()}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}
          >
            {loading ? <Search size={18} className="pulse-dot" /> : <Search size={18} />}
            {loading ? "Analyzing Semantic Gaps..." : "Analyze Skill Gaps"}
          </button>
        </div>

        {/* Results Panel */}
        <div className="glass-card" style={{ flex: '1 1 60%', minWidth: '400px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {!analysis && !loading ? (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#94a3b8' }}>
               <AlertTriangle size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
               <p style={{ margin: 0 }}>Paste a JD and click Analyze to view your skill gaps.</p>
             </div>
          ) : loading ? (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--primary)' }}>
               <Search size={36} className="pulse-dot" style={{ marginBottom: '16px' }} />
               <p style={{ margin: 0, fontWeight: '500' }}>AI is extracting and comparing skills...</p>
             </div>
          ) : (
            <>
              {/* Skills Comparison */}
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={18} color="#16a34a" /> Matched Skills
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {analysis.matching_skills?.length > 0 ? analysis.matching_skills.map((skill, i) => (
                    <span key={i} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: '500' }}>
                      {skill}
                    </span>
                  )) : <span style={{ color: '#94a3b8', fontSize: '13px' }}>No direct matches found.</span>}
                </div>
              </div>

              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <XCircle size={18} color="#dc2626" /> Missing Skills
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {analysis.missing_skills?.length > 0 ? analysis.missing_skills.map((skill, i) => (
                    <span key={i} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '16px', fontSize: '13px', fontWeight: '500' }}>
                      {skill}
                    </span>
                  )) : <span style={{ color: '#94a3b8', fontSize: '13px' }}>No missing skills! You're a perfect match.</span>}
                </div>
              </div>

              {/* Learning Resources */}
              {analysis.learning_resources?.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PlayCircle size={18} color="#eab308" /> Recommended Free Courses
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {analysis.learning_resources.map((resource, i) => (
                      <a 
                        key={i}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', transition: 'transform 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                      >
                        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                          <img src={resource.thumbnail} alt={resource.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PlayCircle color="white" size={24} />
                          </div>
                        </div>
                        <div style={{ padding: '12px' }}>
                          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Learn {resource.skill}</div>
                          <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {resource.title}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Project Recommendations */}
              {analysis.project_recommendations?.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Terminal size={18} color="var(--primary)" /> Portfolio Building Mini-Projects
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {analysis.project_recommendations.map((proj, i) => (
                      <div key={i} style={{ background: 'rgba(2, 132, 199, 0.04)', border: '1px solid rgba(2, 132, 199, 0.2)', padding: '16px', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '15px' }}>{proj.title}</h4>
                        <p style={{ margin: '0 0 12px 0', color: '#475569', fontSize: '13px', lineHeight: '1.5' }}>{proj.description}</p>
                        
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>Implementation Steps:</div>
                        <ol style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontSize: '13px', lineHeight: '1.6' }}>
                          {proj.steps?.map((step, j) => (
                            <li key={j}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </>
          )}

        </div>

      </div>

    </div>
  );
}
