import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, UserX, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth, ADMIN_EMAIL } from '../context/AuthContext';

interface ApprovalRecord {
  id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'approved' | 'inactive';
  requested_at: string;
  updated_at: string;
}

type FilterTab = 'pending' | 'approved' | 'inactive' | 'all';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending:  { background: 'rgba(255,165,2,0.12)',  color: '#ffa502', border: '1px solid rgba(255,165,2,0.3)'  },
  approved: { background: 'rgba(0,255,157,0.08)',  color: 'var(--accent-primary)', border: '1px solid rgba(0,255,157,0.25)' },
  inactive: { background: 'rgba(255,71,87,0.1)',   color: 'var(--accent-danger)',  border: '1px solid rgba(255,71,87,0.3)'  },
};

function StatusBadge({ status }: { status: string }) {
  const icon = status === 'pending' ? <Clock size={11} />
             : status === 'approved' ? <UserCheck size={11} />
             : <UserX size={11} />;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.6rem', borderRadius: '999px',
      fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize', letterSpacing: '0.04em',
      ...(STATUS_STYLE[status] ?? {}),
    }}>
      {icon}{status}
    </span>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords]   = useState<ApprovalRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<FilterTab>('pending');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.email !== ADMIN_EMAIL) { navigate('/'); return; }
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_approvals')
      .select('*')
      .order('requested_at', { ascending: false });
    if (!error && data) setRecords(data as ApprovalRecord[]);
    setLoading(false);
  }

  async function setStatus(userId: string, status: 'approved' | 'inactive') {
    setUpdating(userId);
    await supabase
      .from('user_approvals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    setRecords(prev =>
      prev.map(r => r.user_id === userId ? { ...r, status, updated_at: new Date().toISOString() } : r),
    );
    setUpdating(null);
  }

  async function removeUser(userId: string) {
    if (!confirm('Remove this user? They will not be able to log in. You can re-approve them later.')) return;
    setUpdating(userId);
    await supabase
      .from('user_approvals')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    setRecords(prev =>
      prev.map(r => r.user_id === userId ? { ...r, status: 'inactive', updated_at: new Date().toISOString() } : r),
    );
    setUpdating(null);
  }

  const counts = {
    pending:  records.filter(r => r.status === 'pending').length,
    approved: records.filter(r => r.status === 'approved').length,
    inactive: records.filter(r => r.status === 'inactive').length,
  };

  const filtered = tab === 'all' ? records : records.filter(r => r.status === tab);

  if (!user || user.email !== ADMIN_EMAIL) return null;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>User Approvals</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Manage who can access FitTrack
          </p>
        </div>
        <button className="btn-secondary" onClick={load} disabled={loading} style={{ gap: '0.4rem' }}>
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Pending',  value: counts.pending,  color: '#ffa502' },
          { label: 'Approved', value: counts.approved, color: 'var(--accent-primary)' },
          { label: 'Inactive', value: counts.inactive, color: 'var(--accent-danger)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'inactive', 'all'] as FilterTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.35rem 0.875rem',
              borderRadius: '999px',
              border: '1px solid',
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: tab === t ? 'var(--accent-secondary)' : 'transparent',
              borderColor: tab === t ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              color: tab === t ? '#fff' : 'var(--text-secondary)',
              textTransform: 'capitalize',
            }}
          >
            {t}{t !== 'all' ? ` (${counts[t as keyof typeof counts]})` : ''}
          </button>
        ))}
      </div>

      {/* User list */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            No {tab !== 'all' ? tab : ''} users found.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(r => {
            const busy = updating === r.user_id;
            const signupDate = new Date(r.requested_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            });
            return (
              <div key={r.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>

                  {/* User info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.35rem', wordBreak: 'break-all' }}>
                      {r.email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <StatusBadge status={r.status} />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        Signed up {signupDate}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons:
                      pending  → [Approve] [Remove]
                      approved → [Remove]
                      inactive → [Approve]            */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap' }}>
                    {r.status !== 'approved' && (
                      <button
                        className="btn-primary"
                        style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
                        disabled={busy}
                        onClick={() => setStatus(r.user_id, 'approved')}
                      >
                        <UserCheck size={13} /> Approve
                      </button>
                    )}
                    {r.status !== 'inactive' && (
                      <button
                        className="btn-danger"
                        style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
                        disabled={busy}
                        onClick={() => removeUser(r.user_id)}
                      >
                        <UserX size={13} /> Remove
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
