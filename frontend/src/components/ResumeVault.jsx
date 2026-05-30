import React, { useState, useEffect } from 'react';
import { Layers, CheckCircle, Star, Trash2 } from 'lucide-react';
import ResumeSectionUploader from './ResumeSectionUploader';
import ParsedReviewForm from './ParsedReviewForm';

export default function ResumeVault({ backendUrl, onProfileUpdate }) {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Review flow state
  const [reviewingResume, setReviewingResume] = useState(null); // { id, parsedData }

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/resume/list`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setResumes(data);
      }
    } catch (e) {
      console.error("Error loading resumes:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleSetPrimary = async (id) => {
    try {
      const res = await fetch(`${backendUrl}/api/resume/set-primary/${id}`, {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        fetchResumes();
        if (onProfileUpdate) onProfileUpdate();
      }
    } catch (e) {
      console.error("Error setting primary resume:", e);
    }
  };

  const handleDelete = async (id, filename) => {
    if (!window.confirm(`Are you sure you want to delete the resume version "${filename}"?`)) return;
    try {
      const res = await fetch(`${backendUrl}/api/resume/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        fetchResumes();
        if (onProfileUpdate) onProfileUpdate();
      }
    } catch (e) {
      console.error("Error deleting resume:", e);
    }
  };

  const handleUploadSuccess = (resume, parsedData) => {
    // Switch to review mode
    setReviewingResume({ id: resume.id, parsedData });
  };

  const handleSaveSuccess = () => {
    setReviewingResume(null);
    fetchResumes();
    if (onProfileUpdate) onProfileUpdate();
  };

  if (reviewingResume) {
    return (
      <ParsedReviewForm
        resumeId={reviewingResume.id}
        parsedData={reviewingResume.parsedData}
        backendUrl={backendUrl}
        onSaveSuccess={handleSaveSuccess}
        onCancel={() => setReviewingResume(null)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Introduction Card */}
      <div className="glass-card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', margin: '0 0 8px 0' }}>
          <Layers className="inline-icon" /> AI Resume Version Manager
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
          Upload targeted resume versions (e.g. Frontend Engineer, Product Manager).
          Set your primary resume, review parsed details, and tailored job alerts will reflect your primary goals.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left Side: Upload Zone */}
        <div style={{ flex: '1 1 35%', minWidth: '320px' }}>
          <ResumeSectionUploader 
            backendUrl={backendUrl} 
            onUploadSuccess={handleUploadSuccess} 
          />
        </div>

        {/* Right Side: Version List */}
        <div style={{ flex: '1 1 55%', minWidth: '400px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
            Resume Versions ({resumes.length})
          </h3>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            {resumes.map(r => (
              <div 
                key={r.id} 
                className="glass-card" 
                style={{ 
                  borderLeft: r.is_primary ? '4px solid var(--primary)' : '4px solid #cbd5e1',
                  background: r.is_primary ? 'rgba(2, 132, 199, 0.01)' : '#fff',
                  transition: 'transform 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', color: 'var(--primary)', fontSize: '16px', fontWeight: '700' }}>
                      {r.label}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Uploaded: {new Date(r.upload_date).toLocaleDateString()} • {r.filename}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {r.is_primary ? (
                      <span className="badge" style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={12} fill="var(--primary)" /> Active Primary
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetPrimary(r.id)}
                        className="btn"
                        style={{ 
                          fontSize: '11px', 
                          padding: '4px 8px', 
                          background: '#f1f5f9', 
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Set Active
                      </button>
                    )}

                    <button 
                      onClick={() => handleDelete(r.id, r.filename)}
                      style={styles.deleteBtn}
                      title="Delete Resume"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {r.parsed_data && r.parsed_data.summary && (
                  <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {r.parsed_data.summary.substring(0, 150)}...
                  </p>
                )}

                {r.parsed_data && r.parsed_data.skills && (
                  <div className="tags-list" style={{ marginTop: '8px' }}>
                    {r.parsed_data.skills.slice(0, 5).map(skill => (
                      <span key={skill} className="tag-skill">{skill}</span>
                    ))}
                    {r.parsed_data.skills.length > 5 && (
                      <span className="tag-skill" style={{ background: 'rgba(2, 132, 199, 0.04)' }}>
                        +{r.parsed_data.skills.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {resumes.length === 0 && !loading && (
              <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                <Layers size={48} style={{ opacity: 0.15, margin: '0 auto 16px' }} />
                <h4 style={{ margin: '0 0 4px 0', color: '#475569' }}>No Resume Versions Found</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Upload a targeted resume on the left to start tracking versions and analyzing ATS scores.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--rose)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  }
};
