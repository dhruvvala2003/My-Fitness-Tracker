import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, UserX, Clock, RefreshCw, Upload, Pencil, Trash2, Video, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ApprovalRecord {
  id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'approved' | 'inactive';
  requested_at: string;
  updated_at: string;
}

interface PermRow {
  can_upload: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

type PermKey = keyof PermRow;
type FilterTab = 'pending' | 'approved' | 'inactive' | 'all';

const EMPTY_PERM: PermRow = { can_upload: false, can_edit: false, can_delete: false };

const PERM_META: { key: PermKey; label: string; icon: typeof Upload; hint: string }[] = [
  { key: 'can_upload', label: 'Upload', icon: Upload, hint: 'Can add new videos to the shared library' },
  { key: 'can_edit',   label: 'Edit',   icon: Pencil, hint: 'Can rename / re-categorise their own videos' },
  { key: 'can_delete', label: 'Delete', icon: Trash2, hint: 'Can delete their own videos' },
];

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending:  { background: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)'  },
  approved: { background: 'rgba(52,211,153,0.08)',  color: 'var(--accent-primary)', border: '1px solid rgba(52,211,153,0.25)' },
  inactive: { background: 'rgba(248,113,113,0.1)',   color: 'var(--accent-danger)',  border: '1px solid rgba(248,113,113,0.3)'  },
};

async function fetchAdminData() {
  const [approvals, permissions] = await Promise.all([
    supabase.from('user_approvals').select('*').order('requested_at', { ascending: false }),
    supabase.from('video_permissions').select('user_id, can_upload, can_edit, can_delete'),
  ]);
  return { approvals, permissions };
}
type AdminData = Awaited<ReturnType<typeof fetchAdminData>>;

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
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords]   = useState<ApprovalRecord[]>([]);
  const [perms, setPerms]       = useState<Record<string, PermRow>>({});
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<FilterTab>('pending');
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const applyAdminData = useCallback(({ approvals, permissions }: AdminData) => {
    if (!approvals.error && approvals.data) setRecords(approvals.data as ApprovalRecord[]);
    if (permissions.error) {
      setError('Could not load video permissions — run supabase-migration-v2.sql in Supabase first.');
    } else {
      const map: Record<string, PermRow> = {};
      for (const row of permissions.data ?? []) {
        map[row.user_id] = { can_upload: !!row.can_upload, can_edit: !!row.can_edit, can_delete: !!row.can_delete };
      }
      setPerms(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!isAdmin) { navigate('/'); return; }
    let active = true;
    fetchAdminData().then(r => { if (active) applyAdminData(r); });
    return () => { active = false; };
  }, [user, isAdmin, authLoading, navigate, applyAdminData]);

  function load() {
    setLoading(true);
    setError(null);
    fetchAdminData().then(applyAdminData);
  }

  async function setStatus(userId: string, status: 'approved' | 'inactive') {
    setUpdating(userId);
    const { error: err } = await supabase
      .from('user_approvals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (err) setError(err.message);
    else setRecords(prev =>
      prev.map(r => r.user_id === userId ? { ...r, status, updated_at: new Date().toISOString() } : r),
    );
    setUpdating(null);
  }

  async function removeUser(userId: string) {
    if (!confirm('Remove this user? They will not be able to log in. You can re-approve them later.')) return;
    await setStatus(userId, 'inactive');
  }

  async function togglePerm(userId: string, key: PermKey) {
    const current = perms[userId] ?? EMPTY_PERM;
    const next: PermRow = { ...current, [key]: !current[key] };
    setPerms(prev => ({ ...prev, [userId]: next }));   // optimistic
    setError(null);
    const { error: err } = await supabase.from('video_permissions').upsert({
      user_id: userId,
      ...next,
      updated_at: new Date().toISOString(),
    });
    if (err) {
      setPerms(prev => ({ ...prev, [userId]: current })); // revert
      setError(`Could not update permission: ${err.message}`);
    }
  }

  async function setAllPerms(userId: string, value: boolean) {
    const current = perms[userId] ?? EMPTY_PERM;
    const next: PermRow = { can_upload: value, can_edit: value, can_delete: value };
    setPerms(prev => ({ ...prev, [userId]: next }));
    const { error: err } = await supabase.from('video_permissions').upsert({
      user_id: userId, ...next, updated_at: new Date().toISOString(),
    });
    if (err) {
      setPerms(prev => ({ ...prev, [userId]: current }));
      setError(`Could not update permission: ${err.message}`);
    }
  }

  const counts = {
    pending:  records.filter(r => r.status === 'pending').length,
    approved: records.filter(r => r.status === 'approved').length,
    inactive: records.filter(r => r.status === 'inactive').length,
  };
  const uploaders = records.filter(r => r.status === 'approved' && perms[r.user_id]?.can_upload).length;

  const filtered = tab === 'all' ? records : records.filter(r => r.status === tab);

  if (!user || !isAdmin) return null;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Admin</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Approve accounts and decide who may upload, edit or delete videos.
          </p>
        </div>
        <button className="btn-secondary" onClick={load} disabled={loading} style={{ gap: '0.4rem' }}>
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
          Refresh
        </button>
      </div>

      {error && <p className="form-error" style={{ marginBottom: '1rem' }}>{error}</p>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Pending',  value: counts.pending,  color: '#fbbf24' },
          { label: 'Approved', value: counts.approved, color: 'var(--accent-primary)' },
          { label: 'Inactive', value: counts.inactive, color: 'var(--accent-danger)' },
          { label: 'Can upload', value: uploaders, color: 'var(--accent-blue)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* How permissions work */}
      <div className="notice" style={{ marginBottom: '1.25rem' }}>
        <ShieldCheck size={16} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Video library permissions.</strong> Every approved user can <em>watch</em> all videos.
          Use the toggles on each approved user to grant <em>Upload</em>, <em>Edit</em> and <em>Delete</em> separately.
          Edit/Delete apply to that user's own uploads; your admin account can always edit or delete any video.
          These rules are enforced by the database, not just hidden in the UI.
        </div>
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
            const p = perms[r.user_id] ?? EMPTY_PERM;
            const allOn = p.can_upload && p.can_edit && p.can_delete;
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

                {/* Video permissions — only meaningful for users who can log in */}
                {r.status === 'approved' && (
                  <div className="perm-row">
                    <span className="perm-row-label"><Video size={13} /> Video library</span>
                    {PERM_META.map(({ key, label, icon: Icon, hint }) => (
                      <button
                        key={key}
                        className={`perm-toggle${p[key] ? ' on' : ''}`}
                        onClick={() => togglePerm(r.user_id, key)}
                        title={hint}
                        aria-pressed={p[key]}
                      >
                        <Icon size={12} /> {label}
                      </button>
                    ))}
                    <button className="link-btn" style={{ marginLeft: 'auto' }} onClick={() => setAllPerms(r.user_id, !allOn)}>
                      {allOn ? 'Revoke all' : 'Allow all'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
