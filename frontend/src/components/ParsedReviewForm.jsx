import React, { useState } from 'react';
import { User, Briefcase, GraduationCap, Code, Plus, Trash2, Check, ArrowRight } from 'lucide-react';

export default function ParsedReviewForm({ resumeId, parsedData, backendUrl, onSaveSuccess, onCancel }) {
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'experience' | 'education' | 'skills'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Editable State variables
  const [name, setName] = useState(parsedData.name || '');
  const [email, setEmail] = useState(parsedData.email || '');
  const [phone, setPhone] = useState(parsedData.phone || '');
  const [links, setLinks] = useState(parsedData.links ? parsedData.links.join('\n') : '');
  const [summary, setSummary] = useState(parsedData.summary || '');
  
  // Arrays/lists
  const [skills, setSkills] = useState(parsedData.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [softSkills, setSoftSkills] = useState(parsedData.soft_skills || []);
  const [newSoftSkill, setNewSoftSkill] = useState('');
  const [careerGoals, setCareerGoals] = useState(parsedData.career_goals || []);
  const [newGoal, setNewGoal] = useState('');

  // Complex lists
  const [experience, setExperience] = useState(parsedData.experience || []);
  const [education, setEducation] = useState(parsedData.education || []);

  // --- Skill Handlers ---
  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };
  const removeSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  // --- Soft Skill Handlers ---
  const addSoftSkill = () => {
    if (newSoftSkill.trim() && !softSkills.includes(newSoftSkill.trim())) {
      setSoftSkills([...softSkills, newSoftSkill.trim()]);
      setNewSoftSkill('');
    }
  };
  const removeSoftSkill = (index) => {
    setSoftSkills(softSkills.filter((_, i) => i !== index));
  };

  // --- Career Goal Handlers ---
  const addGoal = () => {
    if (newGoal.trim()) {
      setCareerGoals([...careerGoals, newGoal.trim()]);
      setNewGoal('');
    }
  };
  const removeGoal = (index) => {
    setCareerGoals(careerGoals.filter((_, i) => i !== index));
  };

  // --- Experience Handlers ---
  const addJob = () => {
    setExperience([...experience, {
      job_title: 'New Position',
      company_name: 'New Company',
      dates_of_employment: '2024 - Present',
      responsibilities: ['Responsibility description']
    }]);
  };
  const removeJob = (index) => {
    setExperience(experience.filter((_, i) => i !== index));
  };
  const updateJobField = (index, field, value) => {
    const updated = [...experience];
    updated[index][field] = value;
    setExperience(updated);
  };
  const updateJobBullet = (jobIndex, bulletIndex, value) => {
    const updated = [...experience];
    updated[jobIndex].responsibilities[bulletIndex] = value;
    setExperience(updated);
  };
  const addJobBullet = (jobIndex) => {
    const updated = [...experience];
    updated[jobIndex].responsibilities.push('New responsibility bullet point');
    setExperience(updated);
  };
  const removeJobBullet = (jobIndex, bulletIndex) => {
    const updated = [...experience];
    updated[jobIndex].responsibilities = updated[jobIndex].responsibilities.filter((_, i) => i !== bulletIndex);
    setExperience(updated);
  };

  // --- Education Handlers ---
  const addSchool = () => {
    setEducation([...education, {
      degree: 'B.S. Computer Science',
      institution: 'State University',
      graduation_year: '2025',
      relevant_coursework: ['Data Structures']
    }]);
  };
  const removeSchool = (index) => {
    setEducation(education.filter((_, i) => i !== index));
  };
  const updateSchoolField = (index, field, value) => {
    const updated = [...education];
    updated[index][field] = value;
    setEducation(updated);
  };
  const addCourse = (schoolIndex, courseText) => {
    if (!courseText.trim()) return;
    const updated = [...education];
    if (!updated[schoolIndex].relevant_coursework) {
      updated[schoolIndex].relevant_coursework = [];
    }
    if (!updated[schoolIndex].relevant_coursework.includes(courseText.trim())) {
      updated[schoolIndex].relevant_coursework.push(courseText.trim());
    }
    setEducation(updated);
  };
  const removeCourse = (schoolIndex, courseIndex) => {
    const updated = [...education];
    updated[schoolIndex].relevant_coursework = updated[schoolIndex].relevant_coursework.filter((_, i) => i !== courseIndex);
    setEducation(updated);
  };

  // --- Form Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      name,
      email,
      phone,
      links: links.split('\n').map(l => l.trim()).filter(l => l),
      summary,
      skills,
      soft_skills: softSkills,
      career_goals: careerGoals,
      experience,
      education,
      critique: parsedData.critique || null
    };

    try {
      const res = await fetch(`${backendUrl}/api/resume/save-parsed/${resumeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to save updates.");

      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: 'var(--primary)' }}>Verify AI Section Extraction</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Review, edit, and confirm the parsed resume information before saving.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn" onClick={onCancel} style={{ background: '#f1f5f9', color: '#475569' }}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save & Set Primary'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Tabs list */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          style={{
            ...styles.tabLink,
            color: activeTab === 'basic' ? 'var(--primary)' : '#64748b',
            borderBottomColor: activeTab === 'basic' ? 'var(--primary)' : 'transparent'
          }}
        >
          <User size={16} /> Basic Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('experience')}
          style={{
            ...styles.tabLink,
            color: activeTab === 'experience' ? 'var(--primary)' : '#64748b',
            borderBottomColor: activeTab === 'experience' ? 'var(--primary)' : 'transparent'
          }}
        >
          <Briefcase size={16} /> Experience ({experience.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('education')}
          style={{
            ...styles.tabLink,
            color: activeTab === 'education' ? 'var(--primary)' : '#64748b',
            borderBottomColor: activeTab === 'education' ? 'var(--primary)' : 'transparent'
          }}
        >
          <GraduationCap size={16} /> Education ({education.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('skills')}
          style={{
            ...styles.tabLink,
            color: activeTab === 'skills' ? 'var(--primary)' : '#64748b',
            borderBottomColor: activeTab === 'skills' ? 'var(--primary)' : 'transparent'
          }}
        >
          <Code size={16} /> Skills & Goals
        </button>
      </div>

      {/* TAB CONTENTS */}
      <form onSubmit={handleSubmit}>
        
        {/* BASIC TAB */}
        {activeTab === 'basic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="input-field"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Professional Links (one per line)</label>
              <textarea
                rows={3}
                className="input-field"
                value={links}
                onChange={e => setLinks(e.target.value)}
                placeholder="e.g. https://github.com/username"
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Professional Summary</label>
              <textarea
                rows={4}
                className="input-field"
                value={summary}
                onChange={e => setSummary(e.target.value)}
                style={{ width: '100%', lineHeight: '1.5' }}
              />
            </div>
          </div>
        )}

        {/* EXPERIENCE TAB */}
        {activeTab === 'experience' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Work Experience History</h4>
              <button type="button" onClick={addJob} className="btn" style={{ fontSize: '13px', background: 'rgba(2, 132, 199, 0.05)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}>
                <Plus size={14} /> Add Position
              </button>
            </div>

            {experience.map((job, index) => (
              <div key={index} className="glass-card" style={{ border: '1px solid #e2e8f0', background: '#f8fafc', padding: '16px', position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => removeJob(index)}
                  style={styles.deleteCardBtn}
                  title="Remove Job"
                >
                  <Trash2 size={16} />
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Job Title</label>
                    <input
                      type="text"
                      className="input-field"
                      value={job.job_title}
                      onChange={e => updateJobField(index, 'job_title', e.target.value)}
                      style={{ width: '100%', background: '#fff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Company Name</label>
                    <input
                      type="text"
                      className="input-field"
                      value={job.company_name}
                      onChange={e => updateJobField(index, 'company_name', e.target.value)}
                      style={{ width: '100%', background: '#fff' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Employment Dates</label>
                  <input
                    type="text"
                    className="input-field"
                    value={job.dates_of_employment}
                    onChange={e => updateJobField(index, 'dates_of_employment', e.target.value)}
                    placeholder="e.g. Jan 2022 - Dec 2023"
                    style={{ width: '100%', background: '#fff' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Responsibilities / Accomplishments
                    <button type="button" onClick={() => addJobBullet(index)} style={{ border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Plus size={12} /> Add Bullet
                    </button>
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    {job.responsibilities?.map((bullet, bulletIdx) => (
                      <div key={bulletIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="input-field"
                          value={bullet}
                          onChange={e => updateJobBullet(index, bulletIdx, e.target.value)}
                          style={{ flex: 1, background: '#fff', fontSize: '13px' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeJobBullet(index, bulletIdx)}
                          style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EDUCATION TAB */}
        {activeTab === 'education' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Education History</h4>
              <button type="button" onClick={addSchool} className="btn" style={{ fontSize: '13px', background: 'rgba(2, 132, 199, 0.05)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}>
                <Plus size={14} /> Add Degree
              </button>
            </div>

            {education.map((school, index) => (
              <div key={index} className="glass-card" style={{ border: '1px solid #e2e8f0', background: '#f8fafc', padding: '16px', position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => removeSchool(index)}
                  style={styles.deleteCardBtn}
                  title="Remove Education"
                >
                  <Trash2 size={16} />
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Degree / Major</label>
                    <input
                      type="text"
                      className="input-field"
                      value={school.degree}
                      onChange={e => updateSchoolField(index, 'degree', e.target.value)}
                      style={{ width: '100%', background: '#fff' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Institution</label>
                    <input
                      type="text"
                      className="input-field"
                      value={school.institution}
                      onChange={e => updateSchoolField(index, 'institution', e.target.value)}
                      style={{ width: '100%', background: '#fff' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Graduation Year</label>
                  <input
                    type="text"
                    className="input-field"
                    value={school.graduation_year}
                    onChange={e => updateSchoolField(index, 'graduation_year', e.target.value)}
                    style={{ width: '100%', background: '#fff' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Relevant Coursework</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '6px 0 10px 0' }}>
                    {school.relevant_coursework?.map((course, courseIdx) => (
                      <span key={courseIdx} className="tag-skill" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '11px', background: '#e2e8f0', color: '#1e293b' }}>
                        {course}
                        <button type="button" onClick={() => removeCourse(index, courseIdx)} style={{ background: 'none', border: 'none', padding: 0, color: '#64748b', cursor: 'pointer', fontSize: '10px', lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Type course and press Enter..."
                    style={{ width: '100%', background: '#fff', fontSize: '12px' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCourse(index, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SKILLS TAB */}
        {activeTab === 'skills' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Tech Skills */}
            <div className="form-group">
              <label className="form-label">Technical Skills / Tools (Max 25)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 0 12px 0' }}>
                {skills.map((skill, index) => (
                  <span key={index} className="tag-skill" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(2, 132, 199, 0.08)', color: 'var(--primary)' }}>
                    {skill}
                    <button type="button" onClick={() => removeSkill(index)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  placeholder="e.g. PyTorch"
                  style={{ flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                />
                <button type="button" onClick={addSkill} className="btn" style={{ background: '#f1f5f9', color: '#334155' }}>Add</button>
              </div>
            </div>

            {/* Soft Skills */}
            <div className="form-group">
              <label className="form-label">Soft Skills</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 0 12px 0' }}>
                {softSkills.map((skill, index) => (
                  <span key={index} className="tag-skill" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(34, 197, 94, 0.08)', color: 'var(--emerald)' }}>
                    {skill}
                    <button type="button" onClick={() => removeSoftSkill(index)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  value={newSoftSkill}
                  onChange={e => setNewSoftSkill(e.target.value)}
                  placeholder="e.g. Critical Thinking"
                  style={{ flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSoftSkill(); } }}
                />
                <button type="button" onClick={addSoftSkill} className="btn" style={{ background: '#f1f5f9', color: '#334155' }}>Add</button>
              </div>
            </div>

            {/* Career Goals */}
            <div className="form-group">
              <label className="form-label">Career Goals & Aspirations</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0 12px 0' }}>
                {careerGoals.map((goal, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
                    <span style={{ flex: 1, fontSize: '13.5px', color: '#334155' }}>{goal}</span>
                    <button type="button" onClick={() => removeGoal(index)} style={{ background: 'none', border: 'none', color: 'var(--rose)', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  value={newGoal}
                  onChange={e => setNewGoal(e.target.value)}
                  placeholder="e.g. Transition into a Machine Learning Lead role"
                  style={{ flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGoal(); } }}
                />
                <button type="button" onClick={addGoal} className="btn" style={{ background: '#f1f5f9', color: '#334155' }}>Add</button>
              </div>
            </div>

          </div>
        )}

      </form>
    </div>
  );
}

const styles = {
  tabLink: {
    padding: '10px 14px',
    border: 'none',
    background: 'none',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  deleteCardBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s'
  }
};
