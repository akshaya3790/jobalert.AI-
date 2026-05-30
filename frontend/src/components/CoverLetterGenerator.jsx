import React, { useState } from 'react';
import { PenTool, FileText, Download, Sparkles, RefreshCw, Briefcase, Zap, GraduationCap, FileEdit } from 'lucide-react';

export default function CoverLetterGenerator({ profile, backendUrl }) {
  const [jdText, setJdText] = useState("");
  const [letterType, setLetterType] = useState("experienced");
  const [customInstructions, setCustomInstructions] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [letterText, setLetterText] = useState("");
  const [error, setError] = useState("");

  const types = [
    { id: 'internship', label: 'Internship', icon: <GraduationCap size={16} /> },
    { id: 'fresher', label: 'Fresher / Entry', icon: <Zap size={16} /> },
    { id: 'experienced', label: 'Experienced', icon: <Briefcase size={16} /> },
    { id: 'custom', label: 'Custom Tone', icon: <FileEdit size={16} /> },
  ];

  const generateLetter = async (modifier = "") => {
    if (!profile) {
      setError("Please ensure your resume profile is loaded first.");
      return;
    }
    if (!jdText.trim()) {
      setError("Please paste a Job Description to generate a tailored letter.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${backendUrl}/api/cover-letter/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_json: profile,
          jd_text: jdText,
          letter_type: letterType,
          custom_instructions: customInstructions,
          modifier: modifier
        }),
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Generation failed.");

      setLetterText(data.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (format) => {
    try {
      const res = await fetch(`${backendUrl}/api/cover-letter/export/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letter_text: letterText })
      });
      
      if (!res.ok) throw new Error(`Failed to generate ${format.toUpperCase()}`);
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cover_Letter.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', margin: '0 0 8px 0' }}>
          <PenTool className="inline-icon" /> AI Cover Letter Generator
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
          Instantly draft a highly tailored cover letter based on your career stage and the target Job Description.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left Side: Config Panel */}
        <div className="glass-card" style={{ flex: '1 1 35%', minWidth: '320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label className="form-label">1. Paste Job Description</label>
            <textarea
              className="input-field"
              rows={8}
              placeholder="Paste the target JD here..."
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              style={{ width: '100%', marginTop: '6px', fontSize: '13px' }}
            />
          </div>

          <div>
            <label className="form-label">2. Select Career Stage / Tone</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {types.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLetterType(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                    border: letterType === t.id ? '1px solid var(--primary)' : '1px solid #cbd5e1',
                    background: letterType === t.id ? '#e0f2fe' : '#f8fafc',
                    color: letterType === t.id ? 'var(--primary)' : '#475569',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {letterType === 'custom' && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <label className="form-label">Custom Instructions</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="e.g. Highlight my leadership skills, keep it very bold and creative..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                style={{ width: '100%', marginTop: '6px', fontSize: '13px' }}
              />
            </div>
          )}

          {error && <div style={{ color: '#dc2626', fontSize: '13px' }}>{error}</div>}

          <button 
            className="btn btn-primary" 
            onClick={() => generateLetter()} 
            disabled={loading || !jdText.trim()}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}
          >
            {loading ? <RefreshCw size={18} className="pulse-dot" /> : <Sparkles size={18} />}
            {loading ? "Drafting Letter..." : "Generate Cover Letter"}
          </button>

        </div>

        {/* Right Side: Editor & Export */}
        <div className="glass-card" style={{ flex: '1 1 60%', minWidth: '400px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
              <FileText size={20} color="var(--primary)" /> Letter Studio
            </h3>
            
            {letterText && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={() => downloadFile('docx')} style={{ fontSize: '12px', padding: '6px 12px' }}>
                  <Download size={14} /> DOCX
                </button>
                <button className="btn btn-primary" onClick={() => downloadFile('pdf')} style={{ fontSize: '12px', padding: '6px 12px' }}>
                  <Download size={14} /> ATS PDF
                </button>
              </div>
            )}
          </div>

          {!letterText && !loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: '#94a3b8' }}>
              <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p style={{ margin: 0 }}>Fill out the configuration and click Generate.</p>
            </div>
          ) : loading ? (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: 'var(--primary)' }}>
               <RefreshCw size={36} className="pulse-dot" style={{ marginBottom: '16px' }} />
               <p style={{ margin: 0, fontWeight: '500' }}>AI is writing your cover letter...</p>
             </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              
              {/* Modifiers */}
              <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0 8px' }}>Quick Modifiers:</span>
                <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => generateLetter("shorter")}>Make Shorter</button>
                <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => generateLetter("longer")}>Make Longer</button>
                <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }} onClick={() => generateLetter("formal")}>More Formal</button>
              </div>

              {/* Editor */}
              <textarea
                className="input-field"
                style={{
                  width: '100%',
                  minHeight: '450px',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  padding: '16px',
                  border: '1px solid var(--border-color)',
                  resize: 'vertical'
                }}
                value={letterText}
                onChange={(e) => setLetterText(e.target.value)}
              />
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
