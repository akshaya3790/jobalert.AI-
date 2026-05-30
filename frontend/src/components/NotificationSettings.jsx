import React, { useState, useEffect } from 'react';

const NotificationSettings = () => {
  const [prefs, setPrefs] = useState({
    email_enabled: true,
    telegram_enabled: false,
    whatsapp_enabled: false,
    push_enabled: false,
    telegram_chat_id: '',
    whatsapp_number: '',
    instant_alert_min_score: 90,
    daily_digest_enabled: true
  });
  
  const [loading, setLoading] = useState(true);

  const fetchPrefs = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/notifications/preferences', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrefs();
  }, []);

  const savePrefs = async (newPrefs) => {
    setPrefs(newPrefs);
    try {
      await fetch('http://localhost:8000/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggle = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    savePrefs(updated);
  };

  const handleScoreChange = (e) => {
    const updated = { ...prefs, instant_alert_min_score: parseInt(e.target.value) };
    savePrefs(updated);
  };

  if (loading) return <div className="p-4 text-white">Loading preferences...</div>;

  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-6 text-white max-w-2xl mx-auto mt-8 shadow-xl">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span>🔔</span> Notification Preferences
      </h2>

      <div className="space-y-6">
        {/* Daily Digest */}
        <div className="flex items-center justify-between p-4 bg-[#252525] rounded-lg">
          <div>
            <h3 className="font-semibold text-lg">Daily Job Digest</h3>
            <p className="text-gray-400 text-sm">Receive a daily roundup of top matching jobs.</p>
          </div>
          <button 
            onClick={() => handleToggle('daily_digest_enabled')}
            className={`w-12 h-6 rounded-full transition-colors ${prefs.daily_digest_enabled ? 'bg-blue-500' : 'bg-gray-600'} relative`}
          >
            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${prefs.daily_digest_enabled ? 'transform translate-x-6' : ''}`}></span>
          </button>
        </div>

        {/* Channels */}
        <div className="bg-[#252525] rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-lg border-b border-[#333] pb-2">Alert Channels</h3>
          
          {/* Email */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">✉️ Email Alerts</span>
            <button 
              onClick={() => handleToggle('email_enabled')}
              className={`w-12 h-6 rounded-full transition-colors ${prefs.email_enabled ? 'bg-blue-500' : 'bg-gray-600'} relative`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${prefs.email_enabled ? 'transform translate-x-6' : ''}`}></span>
            </button>
          </div>

          {/* Telegram */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">✈️ Telegram</span>
            <div className="flex items-center gap-4">
              {prefs.telegram_enabled && (
                <input 
                  type="text" 
                  placeholder="Chat ID" 
                  className="bg-[#1e1e1e] border border-[#333] rounded px-2 py-1 text-sm"
                  value={prefs.telegram_chat_id || ''}
                  onChange={(e) => savePrefs({ ...prefs, telegram_chat_id: e.target.value })}
                />
              )}
              <button 
                onClick={() => handleToggle('telegram_enabled')}
                className={`w-12 h-6 rounded-full transition-colors ${prefs.telegram_enabled ? 'bg-blue-500' : 'bg-gray-600'} relative`}
              >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${prefs.telegram_enabled ? 'transform translate-x-6' : ''}`}></span>
              </button>
            </div>
          </div>

          {/* Web Push */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">🌐 Browser Push</span>
            <button 
              onClick={() => handleToggle('push_enabled')}
              className={`w-12 h-6 rounded-full transition-colors ${prefs.push_enabled ? 'bg-blue-500' : 'bg-gray-600'} relative`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${prefs.push_enabled ? 'transform translate-x-6' : ''}`}></span>
            </button>
          </div>
        </div>

        {/* Instant Alerts */}
        <div className="bg-[#252525] rounded-lg p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">⚡ Instant Match Alerts</h3>
            <p className="text-gray-400 text-sm">Notify me immediately when a high-score job is found.</p>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm">Minimum Match Score Trigger: <span className="font-bold text-blue-400">{prefs.instant_alert_min_score}%</span></label>
            <input 
              type="range" 
              min="50" max="100" 
              value={prefs.instant_alert_min_score} 
              onChange={handleScoreChange}
              className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default NotificationSettings;
