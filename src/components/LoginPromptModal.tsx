import { LogIn, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  message?: string;
  onClose: () => void;
}

export default function LoginPromptModal({ message, onClose }: Props) {
  const navigate = useNavigate();
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{
          width: '100%',
          maxWidth: '360px',
          textAlign: 'center',
          padding: '2rem 1.5rem',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            padding: '0.25rem',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(0,255,157,0.08)',
            border: '2px solid rgba(0,255,157,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <LogIn size={26} color="var(--accent-primary)" />
          </div>
        </div>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.6rem' }}>Login Required</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem', lineHeight: 1.65 }}>
          {message ?? 'You are not logged in. Please sign in first to use this feature.'}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => { onClose(); navigate('/login'); }}
          >
            <LogIn size={15} /> Sign In
          </button>
          <button
            className="btn-secondary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
