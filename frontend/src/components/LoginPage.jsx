import React, { useState } from 'react';

const TAGS = ['React', 'Python', 'FastAPI', 'AI/ML', 'Data Science', 'NLP', 'Node.js', 'TensorFlow', 'SQL', 'Cloud', 'DevOps', 'System Design'];

export default function LoginPage({ backendUrl, onLoginSuccess, urlParams, setUrlParams }) {
  const [step, setStep] = useState('email'); // 'email' | 'login' | 'register' | 'forgot-password' | 'reset-password'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Common state
  const [email, setEmail] = useState('');

  // Login form state
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const passwordStrength = (p) => {
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#0284c7'];

  React.useEffect(() => {
    if (urlParams?.mode === 'reset-password' && urlParams?.token) {
      setStep('reset-password');
    }
  }, [urlParams]);

  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to verify email.');
      if (data.exists) {
        setStep('login');
      } else {
        setStep('register');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!email || !loginPassword) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed.');
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      onLoginSuccess(data.access_token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!regName || !email || !regPassword || !regConfirm) { setError('Please fill in all fields.'); return; }
    if (regPassword !== regConfirm) { setError('Passwords do not match.'); return; }
    if (regPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed.');
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      onLoginSuccess(data.access_token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to request password reset.');
      setSuccessMessage('A simulated password reset link has been printed in the server console log. Please check there to proceed!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!newPassword || !confirmNewPassword) { setError('Please fill in all fields.'); return; }
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: urlParams.token, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Password reset failed.');
      
      setSuccessMessage('Password reset successfully! You can now log in.');
      setStep('login');
      setNewPassword('');
      setConfirmNewPassword('');
      if (setUrlParams) setUrlParams({ mode: null, token: null });
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError('');
    setSuccessMessage('');
    const promptEmail = window.prompt(`Enter email address to simulate login with ${provider === 'google' ? 'Google' : 'LinkedIn'}:`);
    if (!promptEmail) return;
    if (!/\S+@\S+\.\S+/.test(promptEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    
    setLoading(true);
    try {
      const mockToken = `mock_${provider}_${promptEmail}`;
      const res = await fetch(`${backendUrl}/api/auth/oauth/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: mockToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `${provider === 'google' ? 'Google' : 'LinkedIn'} login failed.`);
      
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      onLoginSuccess(data.access_token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(step === 'register' ? regPassword : (step === 'reset-password' ? newPassword : ''));

  return (
    <div style={styles.root}>
      {/* Animated background blobs */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />
      <div style={styles.blob3} />

      <div style={styles.container}>
        {/* ── LEFT PANEL ── */}
        <div style={styles.left}>
          <div style={styles.leftInner}>
            {/* Logo */}
            <div style={styles.logo}>
              <span style={styles.logoIcon}>🎓</span>
              <span style={styles.logoText}>GradPlacement<span style={styles.logoAccent}>.AI</span></span>
            </div>

            <h1 style={styles.heroTitle}>Find Your<br />Dream Career</h1>
            <p style={styles.heroSub}>
              AI-powered job matching, resume tailoring, and smart alerts — all in one place.
            </p>

            {/* Floating tags */}
            <div style={styles.tagCloud}>
              {TAGS.map((tag, i) => (
                <span key={tag} style={{
                  ...styles.tag,
                  animationDelay: `${i * 0.3}s`,
                  background: i % 3 === 0
                    ? 'rgba(2, 132, 199, 0.25)'
                    : i % 3 === 1
                    ? 'rgba(34, 197, 94, 0.18)'
                    : 'rgba(168, 85, 247, 0.18)',
                }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Stats row */}
            <div style={styles.statsRow}>
              {[['25+', 'Job Boards'], ['AI', 'Powered Match'], ['Real-Time', 'Alerts']].map(([num, label]) => (
                <div key={label} style={styles.statItem}>
                  <span style={styles.statNum}>{num}</span>
                  <span style={styles.statLabel}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={styles.right}>
          <div style={styles.card}>
            
            {/* Back Button Header */}
            {step !== 'email' && (
              <div style={styles.headerRow}>
                <button 
                  type="button" 
                  onClick={() => { 
                    if (step === 'reset-password') {
                      if (setUrlParams) setUrlParams({ mode: null, token: null });
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }
                    setStep('email'); 
                    setError(''); 
                    setSuccessMessage('');
                  }} 
                  style={styles.backBtn}
                >
                  ← Back
                </button>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div style={styles.errorBanner}>
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Success banner */}
            {successMessage && (
              <div style={styles.successBanner}>
                <span>✅</span> {successMessage}
              </div>
            )}

            {/* ── EMAIL FORM ── */}
            {step === 'email' && (
              <form onSubmit={handleCheckEmail} style={styles.form}>
                <h2 style={styles.stepTitle}>Sign In / Sign Up</h2>
                <p style={styles.formSubtitle}>Enter your email to continue.</p>

                <label style={styles.label}>Email address</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>📧</span>
                  <input
                    id="email-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. alex.johnson@email.com"
                    style={styles.input}
                    autoComplete="email"
                  />
                </div>

                <button
                  id="btn-continue"
                  type="submit"
                  disabled={loading}
                  style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1 }}
                >
                  {loading ? (
                    <span style={styles.spinner} />
                  ) : 'Continue →'}
                </button>

                <div style={styles.divider}>
                  <div style={styles.dividerLine} />
                  <span style={styles.dividerText}>or continue with</span>
                  <div style={styles.dividerLine} />
                </div>

                <div style={styles.oauthRow}>
                  <button
                    type="button"
                    onClick={() => handleOAuth('google')}
                    disabled={loading}
                    style={styles.googleBtn}
                    className="oauth-btn"
                  >
                    <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.16-3.16C17.45 1.68 14.93 1 12 1 7.37 1 3.4 3.67 1.48 7.56l3.78 2.93c.89-2.67 3.39-4.45 6.74-4.45z"/>
                      <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.67 2.85c2.14-1.98 3.74-4.89 3.74-8.56z"/>
                      <path fill="#FBBC05" d="M5.26 10.49C4.99 11.27 4.84 12.1 4.84 13s.15 1.73.42 2.51l-3.78 2.93A11.96 11.96 0 010 13c0-1.99.49-3.87 1.34-5.54l3.92 3.03z"/>
                      <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.67-2.85c-1.1.74-2.5 1.18-4.29 1.18-3.35 0-5.85-1.78-6.74-4.45H1.34l-3.78 2.93C3.4 20.33 7.37 23 12 23z"/>
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOAuth('linkedin')}
                    disabled={loading}
                    style={styles.linkedinBtn}
                    className="oauth-btn"
                  >
                    <svg style={{ width: '18px', height: '18px', fill: '#fff' }} viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                    </svg>
                    LinkedIn
                  </button>
                </div>
              </form>
            )}

            {/* ── LOGIN FORM ── */}
            {step === 'login' && (
              <form onSubmit={handleLogin} style={styles.form}>
                <h2 style={styles.stepTitle}>Welcome back!</h2>
                <p style={styles.formSubtitle}>Enter your password to sign in.</p>

                <div style={styles.readOnlyEmail}>
                  <span style={styles.inputIcon}>📧</span>
                  <span style={styles.readOnlyEmailText}>{email}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '-4px' }}>
                  <label style={styles.label}>Password</label>
                  <button 
                    type="button" 
                    onClick={() => { setStep('forgot-password'); setError(''); setSuccessMessage(''); }}
                    style={styles.forgotLink}
                    className="forgot-link-btn"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{ ...styles.input, paddingRight: '42px' }}
                    autoComplete="current-password"
                  />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>

                <button
                  id="btn-login"
                  type="submit"
                  disabled={loading}
                  style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1 }}
                >
                  {loading ? (
                    <span style={styles.spinner} />
                  ) : 'Sign In →'}
                </button>
              </form>
            )}

            {/* ── REGISTER FORM ── */}
            {step === 'register' && (
              <form onSubmit={handleRegister} style={styles.form}>
                <h2 style={styles.stepTitle}>Create Account</h2>
                <p style={styles.formSubtitle}>Join thousands of students landing great jobs.</p>

                <div style={styles.readOnlyEmail}>
                  <span style={styles.inputIcon}>📧</span>
                  <span style={styles.readOnlyEmailText}>{email}</span>
                </div>

                <label style={styles.label}>Full Name</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>👤</span>
                  <input
                    id="reg-name"
                    type="text"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    style={styles.input}
                    autoComplete="name"
                  />
                </div>

                <label style={styles.label}>Password</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    id="reg-password"
                    type={showPass ? 'text' : 'password'}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    style={{ ...styles.input, paddingRight: '42px' }}
                    autoComplete="new-password"
                  />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>

                {/* Password strength bar */}
                {regPassword && (
                  <div style={styles.strengthWrap}>
                    <div style={styles.strengthBar}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{
                          ...styles.strengthSegment,
                          background: i <= strength ? strengthColor[strength] : '#e2e8f0',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', color: strengthColor[strength] }}>
                      {strengthLabel[strength]}
                    </span>
                  </div>
                )}

                <label style={styles.label}>Confirm Password</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>🔑</span>
                  <input
                    id="reg-confirm"
                    type={showConfirmPass ? 'text' : 'password'}
                    value={regConfirm}
                    onChange={e => setRegConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    style={{
                      ...styles.input,
                      paddingRight: '42px',
                      borderColor: regConfirm && regConfirm !== regPassword ? '#ef4444' : undefined,
                    }}
                    autoComplete="new-password"
                  />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowConfirmPass(!showConfirmPass)}>
                    {showConfirmPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {regConfirm && regConfirm !== regPassword && (
                  <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '-8px', display: 'block' }}>
                    Passwords don't match
                  </span>
                )}

                <button
                  id="btn-register"
                  type="submit"
                  disabled={loading}
                  style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1 }}
                >
                  {loading ? <span style={styles.spinner} /> : 'Create Account →'}
                </button>
              </form>
            )}

            {/* ── FORGOT PASSWORD FORM ── */}
            {step === 'forgot-password' && (
              <form onSubmit={handleForgotPassword} style={styles.form}>
                <h2 style={styles.stepTitle}>Reset Password</h2>
                <p style={styles.formSubtitle}>Enter your email and we'll simulate sending you a password reset link.</p>

                <label style={styles.label}>Email address</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>📧</span>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. alex.johnson@email.com"
                    style={styles.input}
                    autoComplete="email"
                  />
                </div>

                <button
                  id="btn-forgot-password"
                  type="submit"
                  disabled={loading}
                  style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1 }}
                >
                  {loading ? (
                    <span style={styles.spinner} />
                  ) : 'Send Reset Link →'}
                </button>
              </form>
            )}

            {/* ── RESET PASSWORD FORM ── */}
            {step === 'reset-password' && (
              <form onSubmit={handleResetPassword} style={styles.form}>
                <h2 style={styles.stepTitle}>Create New Password</h2>
                <p style={styles.formSubtitle}>Enter your new password below.</p>

                <label style={styles.label}>New Password</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    id="reset-password-input"
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    style={{ ...styles.input, paddingRight: '42px' }}
                    autoComplete="new-password"
                  />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>

                {/* Password strength bar */}
                {newPassword && (
                  <div style={styles.strengthWrap}>
                    <div style={styles.strengthBar}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{
                          ...styles.strengthSegment,
                          background: i <= strength ? strengthColor[strength] : '#e2e8f0',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', color: strengthColor[strength] }}>
                      {strengthLabel[strength]}
                    </span>
                  </div>
                )}

                <label style={styles.label}>Confirm New Password</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>🔑</span>
                  <input
                    id="reset-confirm-input"
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    style={{
                      ...styles.input,
                      paddingRight: '42px',
                      borderColor: confirmNewPassword && confirmNewPassword !== newPassword ? '#ef4444' : undefined,
                    }}
                    autoComplete="new-password"
                  />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowConfirmPass(!showConfirmPass)}>
                    {showConfirmPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmNewPassword && confirmNewPassword !== newPassword && (
                  <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '-8px', display: 'block' }}>
                    Passwords don't match
                  </span>
                )}

                <button
                  id="btn-submit-reset"
                  type="submit"
                  disabled={loading}
                  style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1 }}
                >
                  {loading ? <span style={styles.spinner} /> : 'Reset Password →'}
                </button>
              </form>
            )}

          </div>

          <p style={styles.footerNote}>
            🔒 Your data is encrypted. Passwords are never stored in plaintext.
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @keyframes blobPulse {
          0%, 100% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.08) translate(10px, -10px); }
        }
        @keyframes tagFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        #btn-login:hover, #btn-register:hover, #btn-continue:hover, #btn-forgot-password:hover, #btn-submit-reset:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(2, 132, 199, 0.45) !important;
        }
        .form-input:focus {
          border-color: #0284c7 !important;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12) !important;
        }
        .oauth-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1) !important;
        }
        .forgot-link-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0c1a2e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', sans-serif",
    position: 'relative',
    overflow: 'hidden',
    padding: '20px',
  },
  blob1: {
    position: 'absolute', top: '-100px', left: '-100px',
    width: '500px', height: '500px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(2,132,199,0.18) 0%, transparent 70%)',
    animation: 'blobPulse 8s ease-in-out infinite',
    pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute', bottom: '-80px', right: '-80px',
    width: '400px', height: '400px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)',
    animation: 'blobPulse 10s ease-in-out infinite reverse',
    pointerEvents: 'none',
  },
  blob3: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: '600px', height: '600px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  container: {
    display: 'flex',
    width: '100%',
    maxWidth: '980px',
    minHeight: '580px',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
    position: 'relative',
    zIndex: 1,
  },
  // Left panel
  left: {
    flex: '0 0 42%',
    background: 'linear-gradient(145deg, rgba(2,132,199,0.15) 0%, rgba(15,23,42,0.9) 100%)',
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    padding: '48px 40px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  leftInner: { display: 'flex', flexDirection: 'column', gap: '24px' },
  logo: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  logoIcon: { fontSize: '28px' },
  logoText: { fontSize: '20px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' },
  logoAccent: { color: '#38bdf8' },
  heroTitle: {
    fontSize: '38px', fontWeight: '800', color: '#fff',
    lineHeight: 1.15, letterSpacing: '-1px', margin: 0,
  },
  heroSub: { fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 },
  tagCloud: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  tag: {
    padding: '5px 12px', borderRadius: '20px',
    fontSize: '12px', fontWeight: '500', color: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(255,255,255,0.12)',
    animation: 'tagFloat 3s ease-in-out infinite',
    backdropFilter: 'blur(8px)',
  },
  statsRow: { display: 'flex', gap: '20px', marginTop: '8px' },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statNum: { fontSize: '22px', fontWeight: '800', color: '#38bdf8' },
  statLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  // Right panel
  right: {
    flex: 1,
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 40px',
  },
  card: { width: '100%', maxWidth: '380px' },
  
  headerRow: {
    marginBottom: '16px',
    display: 'flex'
  },
  backBtn: {
    background: 'none', border: 'none', color: '#64748b', fontSize: '14px', 
    fontWeight: '500', cursor: 'pointer', padding: '0', 
    transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
  },
  
  stepTitle: {
    fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0'
  },
  
  readOnlyEmail: {
    display: 'flex', alignItems: 'center', background: '#f1f5f9',
    padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
    border: '1px solid #e2e8f0', position: 'relative'
  },
  readOnlyEmailText: {
    marginLeft: '32px', color: '#475569', fontSize: '14px', fontWeight: '500'
  },

  errorBanner: {
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: '10px', padding: '12px 14px',
    fontSize: '13px', color: '#dc2626',
    marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start',
  },
  successBanner: {
    background: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: '10px', padding: '12px 14px',
    fontSize: '13px', color: '#16a34a',
    marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  formSubtitle: { fontSize: '13.5px', color: '#64748b', margin: '0 0 8px 0' },
  label: { fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '-4px' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '12px', fontSize: '15px', zIndex: 1, userSelect: 'none' },
  input: {
    width: '100%', padding: '11px 14px 11px 38px',
    border: '1.5px solid #e2e8f0', borderRadius: '10px',
    fontSize: '14px', color: '#1e293b',
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box', background: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
  },
  eyeBtn: {
    position: 'absolute', right: '10px',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px',
    padding: '0', lineHeight: 1,
  },
  strengthWrap: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '-4px' },
  strengthBar: { display: 'flex', gap: '3px', flex: 1 },
  strengthSegment: { height: '4px', flex: 1, borderRadius: '2px', transition: 'background 0.3s' },
  submitBtn: {
    marginTop: '8px', padding: '13px',
    background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
    color: '#fff', border: 'none', borderRadius: '12px',
    fontSize: '15px', fontWeight: '700', cursor: 'pointer',
    transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(2, 132, 199, 0.3)',
    letterSpacing: '0.3px',
  },
  forgotLink: {
    background: 'none', border: 'none', color: '#0284c7', fontSize: '12px',
    fontWeight: '600', cursor: 'pointer', padding: '0', 
    transition: 'color 0.2s', outline: 'none',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '16px 0 8px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#e2e8f0',
  },
  dividerText: {
    padding: '0 10px',
    fontSize: '12px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  oauthRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  googleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '11px',
    background: '#fff',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    color: '#334155',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  linkedinBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '11px',
    background: '#0077b5',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  spinner: {
    width: '18px', height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
  footerNote: {
    marginTop: '20px', fontSize: '12px', color: '#94a3b8',
    textAlign: 'center', maxWidth: '380px',
  },
};
