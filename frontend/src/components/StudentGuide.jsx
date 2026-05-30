import React from 'react';
import { BookOpen, CheckCircle, ArrowRight, Star, ShieldAlert } from 'lucide-react';

export default function StudentGuide() {
  const preparationSteps = [
    { title: 'Resume Review', desc: 'Ensure your resume uses standard readable fonts, lacks graphical tables, and lists keywords matching desired roles.', status: 'completed' },
    { title: 'Define Career Preferences', desc: 'Configure desired cities, experience level, expected salary package, and notice period in the Career Preferences card.', status: 'completed' },
    { title: 'Build GitHub Portfolio', desc: 'Add 2-3 clean, documented repositories containing README files, setups, and clean code showing actual implementations.', status: 'pending' },
    { title: 'Core Technical Drills', desc: 'Brush up on Data Structures, Algorithms, SQL queries, and core platform principles (e.g. React hooks, Python decorators).', status: 'pending' },
    { title: 'Mock Interview Practices', desc: 'Practice answering behavioral questions using the STAR framework (Situation, Task, Action, Result).', status: 'pending' }
  ];

  const interviewTips = [
    { q: 'Tell me about yourself?', a: 'Focus on your academic background, core projects, matching technical skills, and passion for the specific role you are applying to. Keep it under 2 minutes.' },
    { q: 'How do you handle team conflict?', a: 'Use a STAR example. Describe a situation where you had a disagreement during a college project, how you listened to the other side, found common ground, and successfully finished the project.' },
    { q: 'Why do you want to join our company?', a: 'Research their recent products, tech stack, and values. Express how your skill stack matches their current tech goals and how you can contribute.' }
  ];

  const atsStandards = [
    { title: 'Single-Column Layout', desc: 'Multi-column resumes can confuse ATS parsers. A single-column clean format is 100% recommended for placement drives.' },
    { title: 'Standard File Format', desc: 'Always upload your resume as a PDF file or DOCX format. Keep it under 2MB.' },
    { title: 'Action Verbs & Impact', desc: 'Use strong verbs (e.g., Designed, Optimized, Implemented) and quantify achievements (e.g., "reduced reload times by 20%").' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      
      {/* Left Column: Guides and Interview drills */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Placement Preparation Roadmap */}
        <div className="glass-card">
          <h3 className="card-title" style={{ marginBottom: '20px' }}>
            <BookOpen size={18} style={{ color: 'var(--primary)' }} />
            Placement Drive Preparation Checklist
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {preparationSteps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: step.status === 'completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(2, 132, 199, 0.08)',
                  color: step.status === 'completed' ? 'var(--emerald)' : 'var(--primary)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  flexShrink: 0,
                  marginTop: '2px'
                }}>
                  {idx + 1}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                    {step.title}
                    {step.status === 'completed' && (
                      <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--emerald)', marginLeft: '8px', padding: '2px 6px', fontSize: '9px' }}>
                        Ready
                      </span>
                    )}
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Behavioral Prep */}
        <div className="glass-card">
          <h3 className="card-title" style={{ marginBottom: '20px' }}>
            <Star size={18} style={{ color: 'var(--secondary)' }} />
            Behavioral Questions & Answer Guides (STAR Method)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {interviewTips.map((tip, idx) => (
              <div key={idx} style={{ padding: '14px', background: 'rgba(2, 132, 199, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>Q: {tip.q}</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  <strong style={{ color: 'var(--emerald)' }}>Answer Approach:</strong> {tip.a}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Column: ATS standards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* ATS Quality Control Card */}
        <div className="glass-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <h3 className="card-title" style={{ marginBottom: '16px' }}>
            <ShieldAlert size={18} style={{ color: 'var(--secondary)' }} />
            ATS Quality Benchmarks
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {atsStandards.map((std, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{std.title}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{std.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Practice sites link */}
        <div className="glass-card">
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Recommended Practice Hubs</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { name: 'LeetCode', desc: 'Coding Interview Practice', url: 'https://leetcode.com' },
              { name: 'GeeksforGeeks', desc: 'Computer Science Portal', url: 'https://geeksforgeeks.org' },
              { name: 'IndiaBIX', desc: 'Quantitative Aptitude Test Prep', url: 'https://indiabix.com' }
            ].map((site, i) => (
              <a key={i} href={site.url} target="_blank" rel="noopener noreferrer" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '10px', 
                background: '#ffffff', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>{site.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{site.desc}</div>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </a>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
