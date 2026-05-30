import React, { useState, useEffect } from 'react';
import { HelpCircle, Mail, Send, CheckCircle2, ChevronDown, ChevronUp, Bell, Check, Globe } from 'lucide-react';

export default function HelpCenter({ backendUrl }) {
  const [faqs, setFaqs] = useState([
    {
      q: 'How is the Job Compatibility Score calculated?',
      a: 'The compatibility score is a deterministic weighted index of 5 dimensions matching your resume and career parameters against the Job Description: Skills Match (35%), Role Alignment (25%), Location Fit (20%), Experience Level (10%), and Work Type arrangement (10%).',
      open: true
    },
    {
      q: 'What is "Explainable AI (XAI)" in this portal?',
      a: 'Explainable AI means the system doesn\'t just show a black-box percentage (e.g. "80% Match"). Instead, it shows you the exact score breakdown for all 5 parameters in visual progress charts, along with plain-English reasons outlining what matched and what was missing.',
      open: false
    },
    {
      q: 'How can I increase my match score for a job posting?',
      a: 'Look at the "Missing Skills" tag list in the job drawer, or go to the "Skill Gaps" tab to see aggregate gaps. If you have those skills but didn\'t list them, click "Edit Resume Details" or upload a revised version containing those keywords to instantly see your match score increase.',
      open: false
    },
    {
      q: 'How does the Persona Vault help in student drives?',
      a: 'Students often apply for slightly different roles (e.g., frontend developer vs. backend python developer). The Persona Vault allows you to save multiple parsed resumes (personas). The AI scanner automatically routes the best matching persona for each job board scanned.',
      open: false
    }
  ]);

  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [emailLogs, setEmailLogs] = useState([]);

  const fetchEmailLogs = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/emails/logs`);
      if (res.ok) {
        const data = await res.json();
        // Sort descending by timestamp
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setEmailLogs(data);
      }
    } catch (e) {
      console.error("Error fetching email logs:", e);
    }
  };

  useEffect(() => {
    fetchEmailLogs();
  }, []);

  const toggleFaq = (idx) => {
    setFaqs(faqs.map((faq, i) => i === idx ? { ...faq, open: !faq.open } : faq));
  };

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (ticketSubject.trim() && ticketMessage.trim()) {
      setSubmitted(true);
      setTicketSubject("");
      setTicketMessage("");
      setTimeout(() => setSubmitted(false), 5000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Frequently Asked Questions */}
        <div className="glass-card">
          <h3 className="card-title" style={{ marginBottom: '20px' }}>
            <HelpCircle size={18} style={{ color: 'var(--primary)' }} />
            Frequently Asked Questions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqs.map((faq, idx) => (
              <div key={idx} style={{ 
                border: '1px solid var(--border-color)', 
                borderRadius: '10px', 
                background: '#ffffff',
                overflow: 'hidden'
              }}>
                <button 
                  onClick={() => toggleFaq(idx)}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--text-primary)', 
                    fontWeight: '600', 
                    fontSize: '14px', 
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <span>{faq.q}</span>
                  {faq.open ? <ChevronUp size={16} style={{ color: 'var(--primary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                </button>
                {faq.open && (
                  <div style={{ 
                    padding: '0 16px 16px 16px', 
                    fontSize: '13px', 
                    color: 'var(--text-secondary)', 
                    lineHeight: '1.6',
                    borderTop: '1px solid rgba(2, 132, 199, 0.05)'
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Contact Placement Officer */}
        <div className="glass-card">
          <h3 className="card-title" style={{ marginBottom: '20px' }}>
            <Mail size={18} style={{ color: 'var(--secondary)' }} />
            Submit Query to Placement Desk
          </h3>

          {submitted ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '30px 16px', 
              background: 'rgba(34, 197, 94, 0.05)', 
              border: '1px solid rgba(34, 197, 94, 0.15)', 
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <CheckCircle2 size={36} style={{ color: 'var(--emerald)' }} />
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>Query Submitted Successfully!</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>The Placement Officer will review and reply via email.</div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input 
                  className="input-field" 
                  placeholder="e.g., Query regarding Amazon placement eligibility" 
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Describe your Query / Issue</label>
                <textarea 
                  className="textarea-field" 
                  placeholder="Type details about what placement support or system issue you need help with..."
                  style={{ height: '140px' }}
                  value={ticketMessage}
                  onChange={e => setTicketMessage(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px', fontSize: '14px' }}>
                <Send size={14} /> Submit Query
              </button>
            </form>
          )}
        </div>

      </div>

      {/* Email Alert Logs Section */}
      <div className="glass-card">
        <div className="card-title-bar" style={{ marginBottom: '16px' }}>
          <h3 className="card-title">
            <Bell size={18} style={{ color: 'var(--primary)' }} />
            Automated Placement Email Alert Logs
          </h3>
          <span className="badge badge-source" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--secondary)' }}></span>
            Real-Time Monitor
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 20px 0', lineHeight: '1.4' }}>
          Below are the logs of automated email notifications. If you've configured SMTP credentials in your <code>.env</code> file, these are sent to <strong>pramathaakshaya999@gmail.com</strong> in real-time. Otherwise, they are recorded here in simulation mode.
        </p>

        {emailLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
            <Bell size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <div style={{ fontSize: '13px' }}>No email notifications have been triggered yet.</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Run a scan in the Job Finder tab for roles that match your resume.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  <th style={{ padding: '12px 8px' }}>Timestamp</th>
                  <th style={{ padding: '12px 8px' }}>Job Posting</th>
                  <th style={{ padding: '12px 8px' }}>Recipient</th>
                  <th style={{ padding: '12px 8px' }}>Match Score</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {emailLogs.map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(2, 132, 199, 0.05)', color: 'var(--text-primary)' }}>
                    <td style={{ padding: '12px 8px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <strong style={{ color: 'var(--primary)' }}>{log.job_title}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>at {log.company}</div>
                    </td>
                    <td style={{ padding: '12px 8px' }}><code>{log.recipient}</code></td>
                    <td style={{ padding: '12px 8px' }}>
                      <span className="badge" style={{ 
                        background: log.match_score >= 80 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(2, 132, 199, 0.1)', 
                        color: log.match_score >= 80 ? 'var(--emerald)' : 'var(--primary)',
                        padding: '3px 8px',
                        fontSize: '11px'
                      }}>{log.match_score}%</span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {log.sent_via_smtp ? (
                        <span style={{ color: 'var(--emerald)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} /> Sent (SMTP)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Globe size={14} /> Simulated
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
