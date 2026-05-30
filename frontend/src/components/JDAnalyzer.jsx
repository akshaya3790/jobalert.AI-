import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, Copy, Check, ChevronRight, AlertCircle, RefreshCw, Send, Save, Download } from 'lucide-react';
import JobMatchScore from './JobMatchScore';

export default function JDAnalyzer({ profile, selectedJob, setSelectedJob, backendUrl }) {
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);

  // Tailoring state
  const [activeTab, setActiveTab] = useState("analysis"); // 'analysis' or 'tailor'
  const [tailoring, setTailoring] = useState(false);
  const [tailoredResume, setTailoredResume] = useState(null);
  
  const triggerAnalysis = async (textToAnalyze = jdText) => {
    if (!profile || !profile.name) {
      setError("Please upload a resume first to run the analysis comparison.");
      return;
    }
    if (!textToAnalyze.trim()) {
      setError("Please paste a job description first.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const res = await fetch(`${backendUrl}/api/jobs/analyze-jd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd_text: textToAnalyze })
      });

      if (!res.ok) throw new Error("Failed to analyze job description.");

      const data = await res.json();
      setAnalysis(data);
      setActiveTab("analysis");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerTailoring = async () => {
    if (!profile || !jdText.trim()) return;
    setTailoring(true);
    setError("");
    try {
      const res = await fetch(`${backendUrl}/api/resume/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_json: profile, // Sending the original parsed profile JSON
          jd_text: jdText
        })
      });

      if (!res.ok) throw new Error("Tailoring failed.");

      const data = await res.json();
      if (data.success) {
        setTailoredResume(data.data);
        setActiveTab("tailor");
      } else {
        throw new Error(data.message);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setTailoring(false);
    }
  };

  // Fill in JD if sent from the job search agent
  useEffect(() => {
    if (selectedJob) {
      setJdText(selectedJob.description);
      triggerAnalysis(selectedJob.description);
      setSelectedJob(null);
    }
  }, [selectedJob]);

  const handleDownload = async (format) => {
    try {
      const res = await fetch(`${backendUrl}/api/resume/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_json: tailoredResume })
      });
      
      if (!res.ok) throw new Error(`Failed to generate ${format.toUpperCase()}`);
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tailored_Resume.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  // Editable fields handlers
  const handleEditSummary = (val) => {
    setTailoredResume({ ...tailoredResume, summary: val });
  };

  const handleEditBullet = (jobIndex, bulletIndex, val) => {
    const updated = { ...tailoredResume };
    updated.experience[jobIndex].bullets[bulletIndex] = val;
    setTailoredResume(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button 
          className={`btn ${activeTab === 'analysis' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('analysis')}
        >
          Match Analysis
        </button>
        <button 
          className={`btn ${activeTab === 'tailor' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setActiveTab('tailor');
            if (!tailoredResume) triggerTailoring();
          }}
          disabled={!analysis || tailoring}
        >
          {tailoring ? <RefreshCw className="pulse-dot" size={16} /> : <Sparkles size={16} />}
          {tailoring ? "Tailoring..." : "AI Tailoring Studio"}
        </button>
      </div>

      {activeTab === 'analysis' && (
        <div className="split-workspace">
          {/* Left Card: Input JD */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 className="card-title">
              <FileText size={18} /> Paste Job Description (JD)
            </h3>
            <textarea 
              className="textarea-field" 
              placeholder="Paste the full job description details here..."
              value={jdText}
              onChange={e => setJdText(e.target.value)}
            />
            <button className="btn btn-primary" onClick={() => triggerAnalysis()} disabled={loading} style={{ alignSelf: 'flex-end' }}>
              {loading ? <RefreshCw className="pulse-dot" size={16} /> : <Check size={16} />}
              Analyze JD
            </button>
            
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--rose)', fontSize: '13px', background: 'rgba(239, 68, 68, 0.08)', padding: '10px', borderRadius: '8px' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>

          {/* Right Card: Job Match Score */}
          <JobMatchScore profile={profile} jdText={jdText} backendUrl={backendUrl} />
        </div>
      )}

      {/* Tailoring Studio */}
      {activeTab === 'tailor' && tailoredResume && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header & Export Actions */}
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} /> AI Tailored Resume
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Review the AI's changes below. Feel free to edit the text before exporting.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => handleDownload('docx')}>
                <Download size={16} /> DOCX
              </button>
              <button className="btn btn-primary" onClick={() => handleDownload('pdf')}>
                <Download size={16} /> ATS-Friendly PDF
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Original Comparison Panel */}
            <div className="glass-card" style={{ flex: 1, padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#64748b' }}>Original Profile</h4>
              
              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
                <strong>Summary:</strong> {profile.summary || "No summary available."}
              </div>
              
              {profile.experience?.map((job, jIdx) => (
                <div key={jIdx} style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#334155' }}>{job.title} | {job.company}</div>
                  <ul style={{ paddingLeft: '16px', margin: '4px 0', fontSize: '12.5px', color: '#475569' }}>
                    {job.bullets?.map((pt, pIdx) => (
                      <li key={pIdx} style={{ marginBottom: '4px' }}>{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Editable Tailored Panel */}
            <div className="glass-card" style={{ flex: 1, padding: '20px', border: '1px solid var(--primary)' }}>
              <h4 style={{ margin: '0 0 16px 0', color: 'var(--primary)' }}>AI Enhanced Profile (Editable)</h4>
              
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ fontSize: '13px' }}>Professional Summary:</strong>
                <textarea 
                  className="input-field"
                  style={{ width: '100%', minHeight: '80px', marginTop: '6px', fontSize: '13px' }}
                  value={tailoredResume.summary || ""}
                  onChange={(e) => handleEditSummary(e.target.value)}
                />
              </div>

              {tailoredResume.experience?.map((job, jIdx) => (
                <div key={jIdx} style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: '600', fontSize: '13px' }}>{job.title} | {job.company}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {job.bullets?.map((pt, pIdx) => (
                      <textarea 
                        key={pIdx}
                        className="input-field"
                        style={{ width: '100%', minHeight: '60px', fontSize: '12.5px', borderLeft: '3px solid var(--emerald)' }}
                        value={pt}
                        onChange={(e) => handleEditBullet(jIdx, pIdx, e.target.value)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      )}

    </div>
  );
}
