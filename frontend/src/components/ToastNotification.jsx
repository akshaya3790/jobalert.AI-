import React, { useEffect } from 'react';
import { CheckCircle, X, Bookmark, BookmarkX } from 'lucide-react';

export default function ToastNotification({ toasts, removeToast }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 2500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const isSave = toast.type === 'save';
  const color = isSave ? '#16a34a' : '#0284c7';
  const bg = isSave ? 'rgba(22,163,74,0.08)' : 'rgba(2,132,199,0.08)';
  const border = isSave ? 'rgba(22,163,74,0.25)' : 'rgba(2,132,199,0.25)';
  const Icon = isSave ? Bookmark : BookmarkX;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(15,23,42,0.92)',
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '10px',
        padding: '12px 16px',
        minWidth: '260px',
        maxWidth: '340px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        animation: 'toastSlideIn 0.3s ease',
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
      onClick={() => onRemove(toast.id)}
    >
      <div style={{ color, flexShrink: 0 }}>
        <Icon size={17} />
      </div>
      <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '500', flex: 1 }}>
        {toast.message}
      </span>
      <X size={13} style={{ color: '#64748b', flexShrink: 0 }} />
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(110%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Hook for managing toasts
let _toastId = 0;
export function useToast() {
  const [toasts, setToasts] = React.useState([]);
  const addToast = React.useCallback((message, type = 'save') => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  const removeToast = React.useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  return { toasts, addToast, removeToast };
}
