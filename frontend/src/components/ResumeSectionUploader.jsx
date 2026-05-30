import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResumeSectionUploader({ backendUrl, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    setError('');
    setSuccess(false);

    if (!file) return false;

    // 1. Validate Extension & MIME type
    const filename = file.name;
    const ext = filename.substring(filename.lastIndexOf('.')).lowerCase || filename.substring(filename.lastIndexOf('.')).toLowerCase();
    const validMimes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (ext !== '.pdf' && ext !== '.docx') {
      setError("Only .pdf and .docx files are accepted.");
      return false;
    }

    // 2. Validate Size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds the maximum size limit of 5MB.");
      return false;
    }

    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        // Pre-fill label with filename minus extension
        const defaultLabel = droppedFile.name.replace(/\.[^/.]+$/, "");
        setLabel(defaultLabel);
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        const defaultLabel = selectedFile.name.replace(/\.[^/.]+$/, "");
        setLabel(defaultLabel);
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select or drop a file first.");
      return;
    }
    if (!label.strip ? !label.trim() : !label.trim()) {
      setError("Please provide a resume label (e.g. Data Scientist CV).");
      return;
    }

    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", label.trim());

    try {
      const res = await fetch(`${backendUrl}/api/resume/upload`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Upload failed.");
      }

      setSuccess(true);
      setFile(null);
      setLabel('');
      if (onUploadSuccess) {
        onUploadSuccess(data.resume, data.parsed_data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--primary)' }}>Upload New Resume Version</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '20px' }}>
        Add a targeted resume version. All text content will be parsed securely using AI.
      </p>

      {error && (
        <div style={styles.errorAlert}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={styles.successAlert}>
          <CheckCircle size={16} />
          <span>Resume uploaded and parsed successfully!</span>
        </div>
      )}

      <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div 
          style={{
            ...styles.dragArea,
            borderColor: dragActive ? 'var(--primary)' : '#e2e8f0',
            background: dragActive ? 'rgba(2, 132, 199, 0.03)' : '#f8fafc'
          }}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            style={{ display: 'none' }}
            onChange={handleChange}
          />
          
          <div style={styles.dragContent}>
            <Upload size={36} style={{ color: dragActive ? 'var(--primary)' : '#94a3b8', marginBottom: '12px' }} />
            {file ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', textAlign: 'center' }}>
                  {file.name}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
            ) : (
              <>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
                  Drag & drop your resume file, or <span style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>browse</span>
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Strictly PDF or DOCX format (Max 5MB)
                </p>
              </>
            )}
          </div>
        </div>

        {file && (
          <div className="form-group" style={{ animation: 'fadeIn 0.2s' }}>
            <label className="form-label">Resume Label / Version Name</label>
            <input
              type="text"
              className="input-field"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Data Scientist Resume, Frontend Engineer"
              required
              style={{ width: '100%', marginTop: '6px' }}
            />
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !file}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: (!file || loading) ? 0.7 : 1,
            cursor: (!file || loading) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? (
            <>
              <span className="spinner-small" />
              <span>Analyzing & Extracting...</span>
            </>
          ) : (
            <>
              <FileText size={18} />
              <span>Upload and Parse Resume</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

const styles = {
  dragArea: {
    border: '2px dashed',
    borderRadius: '12px',
    padding: '30px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
  },
  dragContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorAlert: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#dc2626',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  successAlert: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#16a34a',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }
};
