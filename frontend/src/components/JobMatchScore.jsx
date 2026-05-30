import React, { useState } from 'react';
import { Target, CheckCircle, XCircle, TrendingUp, Briefcase, DollarSign } from 'lucide-react';

export default function JobMatchScore({ profile, jdText, backendUrl }) {
  const [loading, setLoading] = useState(false);
  const [scoreData, setScoreData] = useState(null);
  const [error, setError] = useState('');

  const calculateScore = async () => {
    if (!profile || !jdText.trim()) {
      setError("Please provide a valid resume profile and Job Description.");
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${backendUrl}/api/jobs/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_json: profile,
          jd_text: jdText
        }),
        credentials: "include"
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to calculate score.");
      
      setScoreData(data.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getStrokeColor = (score) => {
    if (score >= 80) return '#16a34a'; // Green
    if (score >= 50) return '#eab308'; // Yellow
    return '#dc2626'; // Red
  };

  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Target size={20} /> Deep Job Match Scoring
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Analyzes Skills, Experience, and Salary requirements.
          </p>
        </div>
        <button className="btn btn-primary" onClick={calculateScore} disabled={loading || !jdText.trim()}>
          {loading ? "Calculating..." : "Calculate Match"}
        </button>
      </div>

      {error && <div style={{ color: '#dc2626', fontSize: '13px' }}>{error}</div>}

      {scoreData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.4s ease' }}>
          
          {/* Top Row: Overall Score & Sub-scores */}
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
            
            {/* Radial Chart */}
            <div style={{ position: 'relative', width: '120px', height: '120px' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={getStrokeColor(scoreData.overall_score)}
                  strokeWidth="3"
                  strokeDasharray={`${scoreData.overall_score}, 100`}
                  style={{ transition: 'stroke-dasharray 1s ease-out' }}
                />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: getStrokeColor(scoreData.overall_score) }}>{scoreData.overall_score}%</span>
                <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Overall</span>
              </div>
            </div>

            {/* Sub-Scores Linear Bars */}
            <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', fontWeight: '500' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={14} color="#0ea5e9"/> Skills Match</span>
                  <span>{scoreData.sub_scores.skills}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${scoreData.sub_scores.skills}%`, background: '#0ea5e9', borderRadius: '4px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', fontWeight: '500' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={14} color="#8b5cf6"/> Experience Match</span>
                  <span>{scoreData.sub_scores.experience}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${scoreData.sub_scores.experience}%`, background: '#8b5cf6', borderRadius: '4px' }} />
                </div>
              </div>

            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0' }} />

          {/* Bottom Row: Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            
            {/* Skills Breakdown */}
            <div>
              <h4 style={{ fontSize: '14px', margin: '0 0 12px 0' }}>Required Skills Breakdown</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {scoreData.metrics.skills.matching_skills.map((s, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '16px', fontSize: '12px' }}>
                    <CheckCircle size={12} /> {s}
                  </span>
                ))}
                {scoreData.metrics.skills.missing_skills.map((s, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fff', color: '#64748b', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '16px', fontSize: '12px' }}>
                    <XCircle size={12} color="#dc2626" /> {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Exp & Salary Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h5 style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Experience Gap</h5>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  You have {scoreData.metrics.experience.user_yoe} years. JD requires {scoreData.metrics.experience.required_yoe} years.
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <h5 style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <DollarSign size={12} /> Salary Check
                </h5>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  {scoreData.metrics.salary.jd_offered_min === 0 
                    ? "Salary not specified in JD." 
                    : scoreData.metrics.salary.indicator}
                </div>
                {scoreData.metrics.salary.jd_offered_min > 0 && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Expected: ${scoreData.metrics.salary.user_expected.toLocaleString()} vs Min Offered: ${scoreData.metrics.salary.jd_offered_min.toLocaleString()}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      )}
    </div>
  );
}
