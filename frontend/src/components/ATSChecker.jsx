import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, CheckCircle, HelpCircle, XCircle, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ATSChecker({ backendUrl }) {
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jdText, setJdText] = useState('');
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const fetchResumes = async () => {
    setLoadingResumes(true);
    try {
      const res = await fetch(`${backendUrl}/api/resume/list`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setResumes(data);
        const primary = data.find(r => r.is_primary);
        if (primary) {
          setSelectedResumeId(primary.id);
        } else if (data.length > 0) {
          setSelectedResumeId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading resumes:", err);
    } finally {
      setLoadingResumes(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setError('');
    setResults(null);

    if (!selectedResumeId) {
      setError("Please select a resume version first.");
      return;
    }
    if (!jdText.trim()) {
      setError("Please paste a Job Description (JD) to analyze.");
      return;
    }

    setLoadingAnalysis(true);

    try {
      // Find the selected resume's parsed text (or send ID and fetch text on backend)
      const selected = resumes.find(r => r.id === selectedResumeId);
      const resumeText = selected?.parsed_data?.raw_text || selected?.parsed_text || "Sample Resume Data";

      const res = await fetch(`${backendUrl}/api/resume/analyze-ats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          jd_text: jdText.trim()
        }),
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "ATS scoring failed.");

      setResults(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#16a34a'; 
    if (score >= 50) return '#ea580c'; 
    return '#dc2626'; 
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', margin: '0 0 8px 0' }}>
          <Sparkles className="inline-icon" /> AI ATS Scanner & Analyzer
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
          Advanced TF-IDF and LLM-powered engine to calculate your precise ATS score, gap keywords, and applicant percentile.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Form panel */}
        <form onSubmit={handleAnalyze} className="glass-card" style={{ flex: '1 1 40%', minWidth: '320px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Compare Target Job</h3>
          
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">1. Choose Resume Version</label>
            {loadingResumes ? (
              <div style={{ fontSize: '13px', color: '#64748b' }}>Loading resumes...</div>
            ) : resumes.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#dc2626', padding: '8px 0' }}>
                No resumes uploaded yet. Go to **Resume Vault** to upload one!
              </div>
            ) : (
              <select
                className="input-field"
                value={selectedResumeId}
                onChange={e => setSelectedResumeId(e.target.value)}
                style={{ width: '100%', marginTop: '6px', background: '#fff' }}
              >
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.label} ({r.filename}) {r.is_primary ? '★ Primary' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">2. Paste Job Description (JD)</label>
            <textarea
              className="input-field"
              rows={10}
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste the target job description requirements, skills, and qualifications here..."
              style={{ width: '100%', marginTop: '6px', fontSize: '13px', lineHeight: '1.5' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loadingAnalysis || resumes.length === 0}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {loadingAnalysis ? (
              <>
                <span className="spinner-small" />
                <span>Running Deep Analysis...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Scan and Check ATS Score</span>
              </>
            )}
          </button>
        </form>

        {/* Results panel */}
        <div style={{ flex: '1 1 50%', minWidth: '360px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {results ? (
            <div className="glass-card" style={{ padding: '24px', animation: 'fadeIn 0.3s' }}>
              
              {/* Circular Match Score & Rank Header */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '20px' }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: `8px solid ${getScoreColor(results.ats_score)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '800',
                  color: getScoreColor(results.ats_score),
                  background: 'rgba(255, 255, 255, 0.05)',
                  boxShadow: `0 0 15px rgba(2, 132, 199, 0.08)`
                }}>
                  {results.ats_score}%
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>ATS Match Rating</h3>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>
                    Based on {results.total_jd_skills} required skills and TF-IDF density.
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500', color: '#0369a1', background: '#e0f2fe', padding: '4px 10px', borderRadius: '12px' }}>
                    <TrendingUp size={14} />
                    {results.percentile_rank}
                  </div>
                </div>
              </div>

              {/* Missing Skills Grid */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14.5px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <XCircle size={16} /> Hard Skills Missing ({results.missing_skills?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {results.missing_skills?.map((skill, i) => (
                    <span key={i} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '12px', padding: '4px 10px', borderRadius: '4px' }}>
                      {skill}
                    </span>
                  ))}
                  {!results.missing_skills?.length && <span style={{ fontSize: '13px', color: '#64748b' }}>None! You hit all required skills.</span>}
                </div>
              </div>

              {/* Keyword Gap Analysis */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={16} /> TF-IDF Keyword Gap Analysis
                </h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#64748b' }}>Add these high-value semantic keywords to your experience bullet points:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {results.missing_keywords?.map((kw, i) => (
                    <span key={i} title={`Importance Score: ${kw.importance_score}`} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', fontSize: '12px', padding: '4px 10px', borderRadius: '4px', cursor: 'help' }}>
                      {kw.keyword} <span style={{ color: '#94a3b8', fontSize: '10px', marginLeft: '4px' }}>+{kw.importance_score}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Suggestions Checklist */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} color="#eab308" /> Weak Bullet Points Identified
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {results.improvement_suggestions?.map((rec, i) => (
                    <div key={i} style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '12px', borderRadius: '8px', fontSize: '13px' }}>
                      <div style={{ marginBottom: '6px', color: '#854d0e', fontWeight: '600' }}>
                        "{rec.original_text}"
                      </div>
                      <div style={{ color: '#a16207', marginBottom: '8px', fontStyle: 'italic' }}>
                        Issue: {rec.reason}
                      </div>
                      <div style={{ color: '#166534', background: '#dcfce7', padding: '8px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                        <strong>Suggestion:</strong> {rec.suggestion}
                      </div>
                    </div>
                  ))}
                  {!results.improvement_suggestions?.length && <span style={{ fontSize: '13px', color: '#64748b' }}>No weak bullet points found!</span>}
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 40px', textAlign: 'center', minHeight: '300px', color: 'var(--text-secondary)' }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <h4 style={{ margin: '0 0 6px 0', color: '#475569' }}>No Analysis Performed</h4>
              <p style={{ margin: 0, fontSize: '13px', maxWidth: '300px' }}>
                Fill in the details on the left and click **Scan** to trigger the AI parser and keyword extraction engine.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
