import React, { useState } from 'react';
import { X, User, Mail, FileText, ImageIcon, Save } from 'lucide-react';

export default function ProfileModal({ user, onClose, backendUrl, onUpdate }) {
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Name cannot be empty.' });
      return;
    }
    setLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      const res = await fetch(`${backendUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, avatar_url: avatarUrl }),
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setFeedback({ type: 'success', message: 'Profile updated successfully!' });
        onUpdate(data.user);
        setTimeout(() => onClose(), 1500);
      } else {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update profile.');
      }
    } catch (e) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(10px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-card" style={{
        width: '100%', maxWidth: '500px', margin: '20px',
        padding: '30px', position: 'relative', border: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '4px', transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <X size={20} />
        </button>

        <h3 className="card-title" style={{ marginBottom: '24px', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={22} style={{ color: 'var(--primary)' }} />
          User Profile Settings
        </h3>

        {/* Profile Avatar Preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)', border: '2px solid rgba(255,255,255,0.1)'
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = ''; }} />
              ) : (
                <span style={{ fontSize: '32px', color: 'white', fontWeight: 'bold' }}>{user?.name?.charAt(0).upperCase || user?.name?.charAt(0) || 'U'}</span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name Field */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
              <User size={14} /> Full Name
            </label>
            <input 
              type="text" 
              className="input-field" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. John Doe"
              style={{ width: '100%' }}
              required 
            />
          </div>

          {/* Email Field (Disabled) */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
              <Mail size={14} /> Email Address (Primary)
            </label>
            <input 
              type="email" 
              className="input-field" 
              value={user?.email || ''} 
              disabled 
              style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed', background: 'rgba(0,0,0,0.1)' }}
            />
          </div>

          {/* Avatar URL Field */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
              <ImageIcon size={14} /> Profile Image URL
            </label>
            <input 
              type="text" 
              className="input-field" 
              value={avatarUrl} 
              onChange={e => setAvatarUrl(e.target.value)} 
              placeholder="e.g. https://example.com/avatar.jpg"
              style={{ width: '100%' }}
            />
          </div>

          {/* Bio Field */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
              <FileText size={14} /> Short Bio
            </label>
            <textarea 
              className="input-field" 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              placeholder="Tell us about yourself..."
              style={{ width: '100%', height: '80px', resize: 'none', fontFamily: 'inherit', padding: '10px 12px' }}
            />
          </div>

          {feedback.message && (
            <div style={{
              padding: '10px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500',
              background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
              color: feedback.type === 'success' ? 'var(--emerald)' : 'var(--rose)'
            }}>
              {feedback.message}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            disabled={loading}
          >
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
