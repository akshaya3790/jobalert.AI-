import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileUser, Search, Settings, Globe, ShieldAlert, Sparkles, RefreshCcw, Briefcase, BookOpen, Layers, TrendingUp, HelpCircle, GraduationCap, LogOut, FileText, SlidersHorizontal, Rocket } from 'lucide-react';
import './App.css';

// Import components
import Dashboard from './components/Dashboard';
import ResumeAnalyzer from './components/ResumeAnalyzer';
import JobAgent from './components/JobAgent';
import JDAnalyzer from './components/JDAnalyzer';
import WebsiteIndex from './components/WebsiteIndex';
import ResumeVault from './components/ResumeVault';
import Applications from './components/Applications';
import SkillGap from './components/SkillGap';
import Analytics from './components/Analytics';
import StudentGuide from './components/StudentGuide';
import HelpCenter from './components/HelpCenter';
import LoginPage from './components/LoginPage';
import ProfileModal from './components/ProfileModal';
import ATSChecker from './components/ATSChecker';
import JobSearchEngine from './components/JobSearchEngine';
import NotificationSettings from './components/NotificationSettings';
import CoverLetterGenerator from './components/CoverLetterGenerator';
import AutoApplyDashboard from './components/AutoApplyDashboard';
import LearningRecommendations from './components/LearningRecommendations';
// In production (Vercel): set VITE_BACKEND_URL to your Render backend URL
// In development: falls back to localhost automatically
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

function App() {
  const [view, setView] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [selectedJobForTailoring, setSelectedJobForTailoring] = useState(null);

  // ── Auth State ──────────────────────────────────────────────────────────────
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('auth_token'));
  const [authUser, setAuthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user')); } catch { return null; }
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [urlParams, setUrlParams] = useState({ mode: null, token: null });

  // API Connection State
  const [apiStatus, setApiStatus] = useState("checking");
  const [aiProvider, setAiProvider] = useState("Gemini");

  const handleLogout = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthToken(null);
    setAuthUser(null);
    setProfile(null);
    setView('dashboard');
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const checkBackendStatus = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.demo_mode) {
          setApiStatus("demo");
        } else {
          setApiStatus("live");
          if (data.is_gemini_enabled && data.is_openai_enabled) {
            setAiProvider("Gemini & OpenAI");
          } else if (data.is_openai_enabled) {
            setAiProvider("OpenAI");
          } else {
            setAiProvider("Gemini");
          }
        }
      } else {
        setApiStatus("offline");
      }
    } catch (e) {
      setApiStatus("offline");
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/resume/profile`);
      if (res.ok) {
        const data = await res.json();
        // API returns nested { persona_name: { name, email, updated_at, ... }, ... }
        if (data && !data.message) {
          const personas = Object.values(data);
          if (personas.length > 0) {
            // Pick the most recently updated persona
            const latest = personas.reduce((a, b) =>
              new Date(a.updated_at || 0) > new Date(b.updated_at || 0) ? a : b
            );
            if (latest && latest.name) {
              setProfile(latest);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error loading profile:", e);
    }
  };

  useEffect(() => {
    checkBackendStatus();
    loadProfile();
    
    // Parse URL query parameters for password reset links
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const token = params.get('token');
    if (mode && token) {
      setUrlParams({ mode, token });
    }

    // Validate HTTP-only session cookie on load
    fetch(`${BACKEND_URL}/api/auth/me`, {
      credentials: "include"
    }).then(r => {
      if (r.ok) {
        r.json().then(user => {
          setAuthUser(user);
          setAuthToken("session-active");
          localStorage.setItem('auth_user', JSON.stringify(user));
        });
      } else {
        handleLogout();
      }
    }).catch(() => {});
  }, []);

  const handleLoginSuccess = (token, user) => {
    setAuthToken(token);
    setAuthUser(user);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setUrlParams({ mode: null, token: null });
  };

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <Dashboard 
            profile={profile} 
            setView={setView} 
            backendUrl={BACKEND_URL} 
          />
        );
      case 'resume':
        return (
          <ResumeAnalyzer 
            profile={profile} 
            setProfile={setProfile} 
            backendUrl={BACKEND_URL} 
          />
        );
      case 'jobs':
        return (
          <JobAgent 
            profile={profile} 
            backendUrl={BACKEND_URL} 
            setView={setView}
            setSelectedJobForTailoring={setSelectedJobForTailoring}
          />
        );
      case 'jd':
        return (
          <JDAnalyzer 
            profile={profile} 
            selectedJob={selectedJobForTailoring}
            setSelectedJob={setSelectedJobForTailoring}
            backendUrl={BACKEND_URL} 
          />
        );
      case 'websites':
        return (
          <WebsiteIndex 
            backendUrl={BACKEND_URL} 
            setView={setView}
          />
        );
      case 'vault':
        return <ResumeVault backendUrl={BACKEND_URL} onProfileUpdate={loadProfile} />;
      case 'ats':
        return <ATSChecker backendUrl={BACKEND_URL} />;
      case 'search':
        return <JobSearchEngine backendUrl={BACKEND_URL} />;
      case 'applications':
        return <Applications backendUrl={BACKEND_URL} />;
      case 'skillgap':
        return <SkillGap profile={profile} backendUrl={BACKEND_URL} />;
      case 'analytics':
        return <Analytics backendUrl={BACKEND_URL} />;
      case 'guide':
        return <StudentGuide />;
      case 'support':
        return <HelpCenter backendUrl={BACKEND_URL} />;
      case 'notifications':
        return <NotificationSettings />;
      case 'cover-letter':
        return <CoverLetterGenerator profile={profile} backendUrl={BACKEND_URL} />;
      case 'auto-apply':
        return <AutoApplyDashboard profile={profile} backendUrl={BACKEND_URL} />;
      case 'learning':
        return <LearningRecommendations backendUrl={BACKEND_URL} />;
      default:
        return <div>View not found</div>;
    }
  };

  const getViewTitle = () => {
    switch (view) {
      case 'dashboard': return "Overview Dashboard";
      case 'resume': return "AI Resume Analyzer";
      case 'jobs': return "Placement Job Finder";
      case 'jd': return "Resume Tailoring & Optimization";
      case 'websites': return "Official Recruitment Platforms";
      case 'vault': return "Student Resume Vault";
      case 'ats': return "AI ATS Match Checker";
      case 'search': return "Job Search Engine";
      case 'applications': return "Application Tracking CRM";
      case 'skillgap': return "Academic Skill Gap Analysis";
      case 'analytics': return "Official Placement Drive Statistics";
      case 'guide': return "Student Placement Preparation Guide";
      case 'support': return "University Placement Support Desk";
      case 'notifications': return "Notification Preferences";
      case 'cover-letter': return "AI Cover Letter Generator";
      case 'auto-apply': return "Auto Apply Assistant";
      case 'learning': return "Learning Recommendations";
      default: return "Placement Portal";
    }
  };

  return (
    // ── Login Gate — Show LoginPage if not authenticated ──────────────────────
    !authToken || urlParams.mode === "reset-password" ? (
      <LoginPage 
        backendUrl={BACKEND_URL} 
        onLoginSuccess={handleLoginSuccess} 
        urlParams={urlParams}
        setUrlParams={setUrlParams}
      />
    ) : (
    <div className="app-container">
      
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}>
            <GraduationCap size={20} />
          </div>
          <span className="logo-text">GradPlacement Portal</span>
        </div>

        <nav className="sidebar-nav" style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', paddingRight: '4px' }}>
          <div className="nav-group-header" style={{ marginTop: '0px' }}>Drive Center</div>
          <div 
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            <LayoutDashboard />
            <span>Dashboard</span>
          </div>

          <div 
            className={`nav-item ${view === 'analytics' ? 'active' : ''}`}
            onClick={() => setView('analytics')}
          >
            <TrendingUp />
            <span>Placement Stats</span>
          </div>

          <div 
            className={`nav-item ${view === 'guide' ? 'active' : ''}`}
            onClick={() => setView('guide')}
          >
            <GraduationCap />
            <span>Preparation Guide</span>
          </div>

          <div className="nav-group-header">Profile & Vault</div>
          <div 
            className={`nav-item ${view === 'resume' ? 'active' : ''}`}
            onClick={() => setView('resume')}
          >
            <FileUser />
            <span>My Resume & Prefs</span>
          </div>
          
          <div 
            className={`nav-item ${view === 'vault' ? 'active' : ''}`}
            onClick={() => setView('vault')}
          >
            <Layers />
            <span>Resume Vault</span>
          </div>

          <div 
            className={`nav-item ${view === 'notifications' ? 'active' : ''}`}
            onClick={() => setView('notifications')}
          >
            <Settings />
            <span>Notifications</span>
          </div>

          <div className="nav-group-header">Job Search Suite</div>
          <div 
            className={`nav-item ${view === 'search' ? 'active' : ''}`}
            onClick={() => setView('search')}
          >
            <SlidersHorizontal />
            <span>Job Search Engine</span>
          </div>

          <div 
            className={`nav-item ${view === 'jobs' ? 'active' : ''}`}
            onClick={() => setView('jobs')}
          >
            <Search />
            <span>Job Finder</span>
          </div>

          <div 
            className={`nav-item ${view === 'jd' ? 'active' : ''}`}
            onClick={() => setView('jd')}
          >
            <Sparkles />
            <span>Resume Tailoring</span>
          </div>

          <div 
            className={`nav-item ${view === 'cover-letter' ? 'active' : ''}`}
            onClick={() => setView('cover-letter')}
          >
            <FileText />
            <span>Cover Letter Gen</span>
          </div>

          <div 
            className={`nav-item ${view === 'auto-apply' ? 'active' : ''}`}
            onClick={() => setView('auto-apply')}
          >
            <Rocket />
            <span>Auto Apply Assistant</span>
          </div>

          <div 
            className={`nav-item ${view === 'ats' ? 'active' : ''}`}
            onClick={() => setView('ats')}
          >
            <FileText />
            <span>ATS Match Checker</span>
          </div>

          <div 
            className={`nav-item ${view === 'websites' ? 'active' : ''}`}
            onClick={() => setView('websites')}
          >
            <Globe />
            <span>Recruitment Boards</span>
          </div>

          <div className="nav-group-header">CRM & Support</div>
          <div 
            className={`nav-item ${view === 'applications' ? 'active' : ''}`}
            onClick={() => setView('applications')}
          >
            <Briefcase />
            <span>Application CRM</span>
          </div>

          <div 
            className={`nav-item ${view === 'skillgap' ? 'active' : ''}`}
            onClick={() => setView('skillgap')}
          >
            <BookOpen />
            <span>Skill Gaps Coach</span>
          </div>

          <div 
            className={`nav-item ${view === 'learning' ? 'active' : ''}`}
            onClick={() => setView('learning')}
          >
            <Layers />
            <span>My Learning Plan</span>
          </div>

          <div 
            className={`nav-item ${view === 'support' ? 'active' : ''}`}
            onClick={() => setView('support')}
          >
            <HelpCircle />
            <span>Placement Support</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div 
            className="user-status-card"
            onClick={() => setShowProfileModal(true)}
            style={{ cursor: 'pointer', transition: 'background 0.2s', borderRadius: '12px', padding: '6px' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Edit Profile Settings"
          >
            <div className="avatar" style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', overflow: 'hidden' }}>
              {authUser && authUser.avatar_url ? (
                <img src={authUser.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                authUser ? authUser.name?.charAt(0) : (profile?.name?.charAt(0) || '?')
              )}
            </div>
            <div className="status-info">
              <span className="status-name">
                {authUser ? authUser.name : (profile?.name || 'Guest User')}
              </span>
              <span className="status-tag">
                {authUser ? authUser.email : (profile?.name ? 'CV Configured' : 'Upload Resume')}
              </span>
            </div>
          </div>
          {authUser && (
            <button
              id="btn-logout"
              onClick={handleLogout}
              style={{
                marginTop: '10px', width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '9px', borderRadius: '10px',
                border: '1.5px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.06)', color: '#ef4444',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; }}
            >
              <LogOut size={14} /> Log Out
            </button>
          )}
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-workspace">
        <div className="workspace-container">
          <header className="top-header">
            <h1 className="page-title">{getViewTitle()}</h1>
            
            {/* Backend / Gemini Status Pill */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {apiStatus === "checking" && (
                <div className="api-pill demo">
                  <RefreshCcw size={14} className="pulse-dot" />
                  Connecting API...
                </div>
              )}
              {apiStatus === "live" && (
                <div className="api-pill">
                  <div className="pulse-dot"></div>
                  {aiProvider} Connected
                </div>
              )}
              {apiStatus === "demo" && (
                <div className="api-pill demo" title="To connect live, add GEMINI_API_KEY to root .env file">
                  <div className="pulse-dot"></div>
                  Demo Mode (Simulation active)
                </div>
              )}
              {apiStatus === "offline" && (
                <div className="api-pill" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--rose)' }}>
                  <ShieldAlert size={14} />
                  Server Offline
                </div>
              )}
            </div>
          </header>

          {/* View Content */}
          <div style={{ flexGrow: 1 }}>
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <ProfileModal 
          user={authUser} 
          onClose={() => setShowProfileModal(false)} 
          backendUrl={BACKEND_URL}
          onUpdate={(updatedUser) => {
            setAuthUser(updatedUser);
            localStorage.setItem('auth_user', JSON.stringify(updatedUser));
          }}
        />
      )}

    </div>
    ) // end ternary auth gate
  );
}

export default App;
