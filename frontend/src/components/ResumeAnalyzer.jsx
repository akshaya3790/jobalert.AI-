import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Edit, Save, Plus, X, Settings, MapPin, Briefcase, Clock, DollarSign } from 'lucide-react';

export default function ResumeAnalyzer({ profile, setProfile, backendUrl }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Career Preferences States
  const [desiredRoles, setDesiredRoles] = useState([]);
  const [currentRoleInput, setCurrentRoleInput] = useState("");
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [experienceYears, setExperienceYears] = useState("");
  const [workType, setWorkType] = useState("Any");
  const [salaryRange, setSalaryRange] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");

  const [prefSaveLoading, setPrefSaveLoading] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

  // Update states when profile changes
  useEffect(() => {
    if (profile) {
      setDesiredRoles(profile.desired_roles || []);
      setSelectedLocations(profile.preferred_locations || []);
      setExperienceYears(profile.experience_years || "");
      setWorkType(profile.work_type || "Any");
      setSalaryRange(profile.salary_range || "");
      setNoticePeriod(profile.notice_period || "");
    }
  }, [profile]);
  
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    summary: "",
    links: [],
    skills: [],
    soft_skills: [],
    career_goals: []
  });
  const [newSkill, setNewSkill] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newSoftSkill, setNewSoftSkill] = useState("");
  const [newCareerGoal, setNewCareerGoal] = useState("");

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      setError("Unsupported file format. Please upload PDF, DOCX or TXT files.");
      return;
    }

    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("persona_name", "default");

    try {
      const response = await fetch(`${backendUrl}/api/resume/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to upload and parse resume.");
      }

      const data = await response.json();
      // API returns nested { persona_name: { name, email, updated_at, ... }, ... }
      // Pick the most recently updated persona
      const personas = Object.values(data);
      const latest = personas.reduce((a, b) =>
        new Date(a.updated_at || 0) > new Date(b.updated_at || 0) ? a : b
      );
      setProfile(latest);
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while uploading. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    setEditForm({
      name: profile.name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      summary: profile.summary || "",
      links: [...(profile.links || [])],
      skills: [...(profile.skills || [])],
      soft_skills: [...(profile.soft_skills || [])],
      career_goals: [...(profile.career_goals || [])]
    });
    setIsEditing(true);
  };

  const handleSavePreferences = async () => {
    setPrefSaveLoading(true);
    setPrefSuccess(false);
    setError("");
    try {
      const response = await fetch(`${backendUrl}/api/resume/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona_name: profile.persona_name || "default",
          desired_roles: desiredRoles,
          preferred_locations: selectedLocations,
          experience_years: experienceYears,
          work_type: workType,
          salary_range: salaryRange,
          notice_period: noticePeriod
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save preferences.");
      }

      const data = await response.json();
      const latest = Object.values(data).find(p => p.persona_name === (profile.persona_name || "default")) || Object.values(data)[0];
      setProfile(latest);
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while saving preferences.");
    } finally {
      setPrefSaveLoading(false);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/resume/update-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, persona_name: profile.persona_name || "default" })
      });

      if (response.ok) {
        const data = await response.json();
        // Unwrap nested response
        const firstPersona = Object.values(data)[0];
        setProfile(firstPersona);
        setIsEditing(false);
      } else {
        throw new Error("Failed to save profile changes.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Safe JSON utility helper
  const json_payload = (obj) => JSON.stringify(obj);

  const addSkill = () => {
    if (newSkill.trim() && !editForm.skills.includes(newSkill.trim())) {
      setEditForm(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove) => {
    setEditForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const addSoftSkill = () => {
    if (newSoftSkill.trim() && !editForm.soft_skills.includes(newSoftSkill.trim())) {
      setEditForm(prev => ({
        ...prev,
        soft_skills: [...prev.soft_skills, newSoftSkill.trim()]
      }));
      setNewSoftSkill("");
    }
  };

  const removeSoftSkill = (skillToRemove) => {
    setEditForm(prev => ({
      ...prev,
      soft_skills: prev.soft_skills.filter(s => s !== skillToRemove)
    }));
  };

  const addCareerGoal = () => {
    if (newCareerGoal.trim() && !editForm.career_goals.includes(newCareerGoal.trim())) {
      setEditForm(prev => ({
        ...prev,
        career_goals: [...prev.career_goals, newCareerGoal.trim()]
      }));
      setNewCareerGoal("");
    }
  };

  const removeCareerGoal = (goalToRemove) => {
    setEditForm(prev => ({
      ...prev,
      career_goals: prev.career_goals.filter(g => g !== goalToRemove)
    }));
  };

  const addLink = () => {
    if (newLink.trim() && !editForm.links.includes(newLink.trim())) {
      setEditForm(prev => ({
        ...prev,
        links: [...prev.links, newLink.trim()]
      }));
      setNewLink("");
    }
  };

  const removeLink = (linkToRemove) => {
    setEditForm(prev => ({
      ...prev,
      links: prev.links.filter(l => l !== linkToRemove)
    }));
  };

  const hasResume = profile && profile.name;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Upload Zone */}
      <div className="glass-card">
        <h3 className="card-title" style={{ marginBottom: '16px' }}>
          <Upload size={18} />
          {hasResume ? "Upload a New Resume Version" : "Upload your Resume"}
        </h3>
        
        <div style={{ position: 'relative' }}>
          <label className="upload-zone" style={{ display: 'block' }}>
            <input 
              type="file" 
              accept=".pdf,.docx,.txt" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }}
              disabled={loading}
            />
            <FileText className="upload-icon" size={40} style={{ color: loading ? 'var(--primary)' : 'var(--text-secondary)' }} />
            {loading ? (
              <div>
                <div style={{ fontWeight: '600', color: 'var(--primary)' }}>AI Agent is parsing your resume...</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>Extracting details & reviewing structure</div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: '600' }}>Drag & drop or click to select a file</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>Supports PDF, DOCX, or TXT formats</div>
              </div>
            )}
          </label>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--rose)', fontSize: '14px', marginTop: '16px', background: 'rgba(239, 68, 68, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>

      {hasResume && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Left Column: Parsed Profile Info */}
          <div className="glass-card">
            <div className="card-title-bar">
              <h3 className="card-title">
                <CheckCircle size={18} className="text-green" />
                Parsed Candidate Details
              </h3>
              {!isEditing ? (
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={startEditing}>
                  <Edit size={14} /> Edit
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={saveProfile}>
                    <Save size={14} /> Save
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {!isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Name</div>
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>{profile.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contact Email</div>
                    <div style={{ fontSize: '15px' }}>{profile.email || "N/A"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone Number</div>
                    <div style={{ fontSize: '15px' }}>{profile.phone || "N/A"}</div>
                  </div>
                </div>

                {profile.links && profile.links.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Portfolio & Links</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {profile.links.map((link, idx) => (
                        <a key={idx} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)', fontSize: '13px', textDecoration: 'none' }}>
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Professional Summary</div>
                  <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-secondary)', marginTop: '4px' }}>{profile.summary}</p>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Technical Skills</div>
                  <div className="tags-list">
                    {profile.skills?.map((skill, idx) => (
                      <span key={idx} className="tag-skill">{skill}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Soft Skills</div>
                  <div className="tags-list">
                    {profile.soft_skills?.map((skill, idx) => (
                      <span key={idx} className="tag-skill" style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.15)', color: 'var(--secondary)' }}>{skill}</span>
                    ))}
                    {(!profile.soft_skills || profile.soft_skills.length === 0) && (
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>None parsed yet</span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Career Goals & Aspirations</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {profile.career_goals?.map((goal, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }}></span>
                        {goal}
                      </div>
                    ))}
                    {(!profile.career_goals || profile.career_goals.length === 0) && (
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>None parsed yet</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="input-field" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="input-field" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="input-field" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Links (GitHub, LinkedIn)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="input-field" style={{ flexGrow: 1 }} placeholder="github.com/username" value={newLink} onChange={e => setNewLink(e.target.value)} />
                    <button className="btn btn-secondary" style={{ padding: '10px' }} onClick={addLink}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {editForm.links.map((link, idx) => (
                      <span key={idx} className="badge badge-source" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {link}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeLink(link)} />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Professional Summary</label>
                  <textarea className="textarea-field" style={{ height: '100px' }} value={editForm.summary} onChange={e => setEditForm({...editForm, summary: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Technical Skills</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="input-field" style={{ flexGrow: 1 }} placeholder="Add skill (e.g. Python)" value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkill()} />
                    <button className="btn btn-secondary" style={{ padding: '10px' }} onClick={addSkill}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {editForm.skills.map((skill, idx) => (
                      <span key={idx} className="tag-skill" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {skill}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeSkill(skill)} />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Soft Skills</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="input-field" style={{ flexGrow: 1 }} placeholder="Add soft skill (e.g. Leadership)" value={newSoftSkill} onChange={e => setNewSoftSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault() || addSoftSkill())} />
                    <button className="btn btn-secondary" style={{ padding: '10px' }} onClick={addSoftSkill}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {editForm.soft_skills?.map((skill, idx) => (
                      <span key={idx} className="tag-skill" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.15)', color: 'var(--secondary)' }}>
                        {skill}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeSoftSkill(skill)} />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Career Goals & Aspirations</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="input-field" style={{ flexGrow: 1 }} placeholder="Add career goal (e.g. Lead product engineering teams)" value={newCareerGoal} onChange={e => setNewCareerGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault() || addCareerGoal())} />
                    <button className="btn btn-secondary" style={{ padding: '10px' }} onClick={addCareerGoal}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {editForm.career_goals?.map((goal, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(0,0,0,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }}></span>
                          {goal}
                        </div>
                        <X size={14} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => removeCareerGoal(goal)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: AI Critique */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 className="card-title">
              <FileText size={18} style={{ color: 'var(--primary)' }} />
              AI Agent CV Analysis
            </h3>
            
            {profile.critique ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--emerald)', fontWeight: '600' }}>Key Strengths</h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {profile.critique.strengths?.map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--amber)', fontWeight: '600' }}>Areas for Optimization</h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {profile.critique.weaknesses?.map((weak, i) => (
                      <li key={i}>{weak}</li>
                    ))}
                  </ul>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#60a5fa', fontWeight: '600' }}>Suggested Enhancements</h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {profile.critique.suggestions?.map((sug, i) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '14px' }}>No structure review generated. Re-upload your resume file to trigger.</p>
              </div>
            )}
          </div>

        </div>

        {/* Career Preferences Card */}
        <div className="glass-card" style={{ marginTop: '24px' }}>
          <div className="card-title-bar" style={{ marginBottom: '20px' }}>
            <h3 className="card-title">
              <Settings size={18} style={{ color: 'var(--primary)' }} />
              Desired Career & Job Preferences
            </h3>
            <button 
              className="btn btn-primary" 
              onClick={handleSavePreferences} 
              disabled={prefSaveLoading}
              style={{ padding: '8px 20px', minWidth: '130px' }}
            >
              {prefSaveLoading ? "Saving..." : prefSuccess ? "Preferences Saved!" : "Save Preferences"}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Left Side: Desired Roles & Locations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={14} /> Desired Roles
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    className="input-field" 
                    placeholder="Type role & press Enter (e.g. Data Scientist)" 
                    value={currentRoleInput} 
                    onChange={e => setCurrentRoleInput(e.target.value)} 
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (currentRoleInput.trim() && !desiredRoles.includes(currentRoleInput.trim())) {
                          setDesiredRoles([...desiredRoles, currentRoleInput.trim()]);
                          setCurrentRoleInput("");
                        }
                      }
                    }} 
                  />
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    style={{ padding: '10px' }}
                    onClick={() => {
                      if (currentRoleInput.trim() && !desiredRoles.includes(currentRoleInput.trim())) {
                        setDesiredRoles([...desiredRoles, currentRoleInput.trim()]);
                        setCurrentRoleInput("");
                      }
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {desiredRoles.map((role, idx) => (
                    <span key={idx} className="tag-skill" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                      {role}
                      <X size={12} style={{ cursor: 'pointer' }} onClick={() => setDesiredRoles(desiredRoles.filter(r => r !== role))} />
                    </span>
                  ))}
                  {desiredRoles.length === 0 && (
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No roles added yet. Matches will default.</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} /> Preferred Locations in India
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '180px', overflowY: 'auto', padding: '8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {[
                    "Remote", "Bengaluru", "Hyderabad", "Mumbai", "Pune", "Delhi NCR", "Chennai", 
                    "Kolkata", "Noida", "Gurugram", "Ahmedabad", "Jaipur", "Kochi", "Coimbatore"
                  ].map((city) => {
                    const isSelected = selectedLocations.includes(city);
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedLocations(selectedLocations.filter(loc => loc !== city));
                          } else {
                            setSelectedLocations([...selectedLocations, city]);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          border: isSelected ? '1px solid var(--cyan)' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                          color: isSelected ? 'var(--cyan)' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: isSelected ? '600' : '400',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Side: Experience, Work Type, Salary & Notice */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Briefcase size={14} /> Years of Experience
                  </label>
                  <select 
                    className="input-field" 
                    value={experienceYears} 
                    onChange={e => setExperienceYears(e.target.value)}
                    style={{ background: 'var(--bg-main)', cursor: 'pointer' }}
                  >
                    <option value="">Select experience</option>
                    <option value="Fresher">Fresher (0 years)</option>
                    <option value="1 Year">1 Year</option>
                    <option value="2 Years">2 Years</option>
                    <option value="3 Years">3 Years</option>
                    <option value="4 Years">4 Years</option>
                    <option value="5 Years">5 Years</option>
                    <option value="6-8 Years">6–8 Years</option>
                    <option value="8-10 Years">8–10 Years</option>
                    <option value="10+ Years">10+ Years</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={14} /> Expected Salary
                  </label>
                  <select 
                    className="input-field" 
                    value={salaryRange} 
                    onChange={e => setSalaryRange(e.target.value)}
                    style={{ background: 'var(--bg-main)', cursor: 'pointer' }}
                  >
                    <option value="">Select expected salary</option>
                    <option value="₹3–5 LPA">₹3–5 LPA</option>
                    <option value="₹5–10 LPA">₹5–10 LPA</option>
                    <option value="₹10–15 LPA">₹10–15 LPA</option>
                    <option value="₹15–25 LPA">₹15–25 LPA</option>
                    <option value="₹25 LPA+">₹25 LPA+</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} /> Notice Period
                  </label>
                  <select 
                    className="input-field" 
                    value={noticePeriod} 
                    onChange={e => setNoticePeriod(e.target.value)}
                    style={{ background: 'var(--bg-main)', cursor: 'pointer' }}
                  >
                    <option value="">Select notice period</option>
                    <option value="Immediately">Immediately</option>
                    <option value="15 days">15 Days</option>
                    <option value="30 days">30 Days</option>
                    <option value="60 days">60 Days</option>
                    <option value="90 days">90 Days</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Work Type</label>
                  <div style={{ display: 'flex', gap: '8px', height: '42px', alignItems: 'center' }}>
                    {["Remote", "Hybrid", "On-site", "Any"].map((type) => {
                      const isSelected = workType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setWorkType(type)}
                          style={{
                            flex: 1,
                            padding: '10px 0',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: isSelected ? '600' : '400',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

    </div>
  );
}
