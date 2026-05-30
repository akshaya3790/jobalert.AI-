import React, { useState } from 'react';
import { Rocket, ShieldCheck, FileText, Send, AlertTriangle, CheckCircle, XCircle, RefreshCw, Terminal } from 'lucide-react';

export default function AutoApplyDashboard({ profile, backendUrl }) {
  const [step, setStep] = useState(1); // 1: URL Input, 2: Pre-Flight/Verify, 3: Execution Terminal
  const [jobUrl, setJobUrl] = useState("");
  const [jdText, setJdText] = useState("");
  
  // Verification State
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  
  // Asset Generation State
  const [generatingCL, setGeneratingCL] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [customFields, setCustomFields] = useState({});

  // Execution State
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (!jobUrl || !jdText) {
      setError("Please provide both URL and JD text for verification.");
      return;
    }
    setError("");
    setLoadingVerify(true);
    
    try {
      // 1. Verify Eligibility & get missing fields
      const resVerify = await fetch(`${backendUrl}/api/auto-apply/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_json: profile, jd_text: jdText }),
        credentials: "include"
      });
      const dataVerify = await resVerify.json();
      
      if (!dataVerify.success) throw new Error("Verification failed.");
      setEligibility(dataVerify.data);
      
      // Initialize dynamic fields
      const fields = {};
      (dataVerify.data.missing_fields || []).forEach(f => { fields[f] = ""; });
      setCustomFields(fields);
      
      // 2. Generate Cover Letter automatically
      setGeneratingCL(true);
      const resCL = await fetch(`${backendUrl}/api/cover-letter/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_json: profile, jd_text: jdText, letter_type: "experienced" }),
        credentials: "include"
      });
      const dataCL = await resCL.json();
      if (dataCL.success) setCoverLetter(dataCL.data);
      
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingVerify(false);
      setGeneratingCL(false);
    }
  };

  const handleCustomFieldChange = (field, value) => {
    setCustomFields(prev => ({ ...prev, [field]: value }));
  };

  const handleExecute = async () => {
    setStep(3);
    setExecuting(true);
    setExecutionResult(null);

    try {
      const res = await fetch(`${backendUrl}/api/auto-apply/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_url: jobUrl,
          resume_json: profile,
          cover_letter_text: coverLetter,
          custom_fields: customFields
        }),
        credentials: "include"
      });

      const data = await res.json();
      if (data.success) {
        setExecutionResult(data.data);
      } else {
        setExecutionResult({ success: false, reason: data.message, logs: [] });
      }
    } catch (e) {
      setExecutionResult({ success: false, reason: e.message, logs: [] });
    } finally {
      setExecuting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setEligibility(null);
    setExecutionResult(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', margin: '0 0 8px 0' }}>
            <Rocket className="inline-icon" /> Auto-Apply Assistant
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
            Automate tedious forms using Headless Browser Automation & AI Field Mapping.
          </p>
        </div>
        {step > 1 && (
          <button className="btn btn-secondary" onClick={reset}>Cancel / Restart</button>
        )}
      </div>

      {error && <div style={{ color: '#dc2626', fontSize: '13px', background: '#fef2f2', padding: '12px', borderRadius: '8px' }}>{error}</div>}

      {/* STEP 1: Target Definition */}
      {step === 1 && (
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
          <h3>1. Define Application Target</h3>
          
          <div>
            <label className="form-label">Job Application URL</label>
            <input 
              type="url" 
              className="input-field" 
              placeholder="https://boards.greenhouse.io/..." 
              value={jobUrl}
              onChange={e => setJobUrl(e.target.value)}
            />
          </div>
          
          <div>
            <label className="form-label">Job Description (For Verification & Cover Letter Generation)</label>
            <textarea 
              className="input-field" 
              rows={8} 
              placeholder="Paste the full JD..."
              value={jdText}
              onChange={e => setJdText(e.target.value)}
            />
          </div>

          <button 
            className="btn btn-primary" 
            onClick={handleVerify} 
            disabled={loadingVerify}
            style={{ alignSelf: 'flex-start', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}
          >
            {loadingVerify ? <RefreshCw className="pulse-dot" size={16} /> : <ShieldCheck size={16} />}
            {loadingVerify ? "Running Pre-Flight Checks..." : "Run Pre-Flight Verification"}
          </button>
        </div>
      )}

      {/* STEP 2: Pre-Flight Review */}
      {step === 2 && eligibility && (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', animation: 'fadeIn 0.3s' }}>
          
          {/* Eligibility Check */}
          <div className="glass-card" style={{ flex: '1 1 45%', padding: '24px', border: `1px solid ${eligibility.eligible ? '#bbf7d0' : '#fecaca'}` }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: eligibility.eligible ? '#16a34a' : '#dc2626' }}>
              {eligibility.eligible ? <CheckCircle /> : <XCircle />} 
              {eligibility.eligible ? "Eligible to Apply" : "Ineligible for Role"}
            </h3>
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '24px' }}>{eligibility.reason}</p>

            {eligibility.eligible && eligibility.missing_fields && eligibility.missing_fields.length > 0 && (
              <div>
                <h4 style={{ fontSize: '14px', color: '#334155', marginBottom: '12px' }}>
                  <AlertTriangle size={14} color="#f59e0b" style={{ display: 'inline', marginRight: '6px' }} />
                  Dynamic Fields Required
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {eligibility.missing_fields.map(field => (
                    <div key={field}>
                      <label className="form-label">{field.replace(/_/g, ' ').toUpperCase()}</label>
                      <input 
                        className="input-field" 
                        value={customFields[field]} 
                        onChange={e => handleCustomFieldChange(field, e.target.value)} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {eligibility.eligible && (
              <button 
                className="btn btn-primary" 
                onClick={handleExecute} 
                style={{ marginTop: '24px', width: '100%', display: 'flex', justifyContent: 'center' }}
              >
                <Send size={16} /> Launch Automation Pipeline
              </button>
            )}
          </div>

          {/* Asset Preview */}
          {eligibility.eligible && (
            <div className="glass-card" style={{ flex: '1 1 45%', padding: '24px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} /> Generated Assets
              </h3>
              
              <div style={{ marginTop: '16px' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Target Cover Letter
                  {generatingCL && <span style={{ color: 'var(--primary)', fontWeight: 'normal' }}>Generating...</span>}
                </label>
                <textarea 
                  className="input-field" 
                  rows={12} 
                  value={coverLetter} 
                  onChange={e => setCoverLetter(e.target.value)}
                  style={{ fontSize: '12px', fontFamily: 'monospace' }}
                  disabled={generatingCL}
                />
              </div>
            </div>
          )}

        </div>
      )}

      {/* STEP 3: Execution Terminal */}
      {step === 3 && (
        <div className="glass-card" style={{ padding: '24px', background: '#0f172a', color: '#f8fafc', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={20} /> Execution Terminal
          </h3>
          
          <div style={{ background: '#000', padding: '16px', borderRadius: '8px', minHeight: '300px', fontFamily: '"Fira Code", monospace', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {executing ? (
               <div style={{ color: '#0ea5e9' }}>
                 <RefreshCw size={14} className="pulse-dot" style={{ display: 'inline', marginRight: '8px' }}/>
                 Browser Engine is running in the background. Please wait...
               </div>
            ) : executionResult ? (
               <>
                 {executionResult.logs.map((log, i) => (
                   <div key={i} style={{ color: '#94a3b8' }}>{`> ${log}`}</div>
                 ))}
                 
                 <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #334155', color: executionResult.success ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                   [PROCESS TERMINATED] {executionResult.reason}
                 </div>
               </>
            ) : null}

          </div>
        </div>
      )}

    </div>
  );
}
