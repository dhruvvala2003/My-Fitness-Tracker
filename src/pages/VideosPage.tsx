import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Play, Trash2, Video, X, Upload, User, Pencil, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';

const CATEGORIES = ['Chest', 'Back', 'Legs', 'Arms', 'Core', 'Abs', 'Cardio', 'Stretching', 'Other'];
const ALL_FILTERS = ['All', ...CATEGORIES];
const BUCKET = 'exercise-videos';

interface VideoMeta {
  id: string;
  uploaded_by: string;
  name: string;
  category: string;
  file_name: string;
  file_path: string;
  size: number;
  mime_type: string;
  created_at: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VideosPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Other');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [orderedIds, setOrderedIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('fittrack_video_order') || '[]'); }
    catch { return []; }
  });
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadVideos() {
    const { data, error } = await supabase
      .from('exercise_videos')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setVideos(data as VideoMeta[]);
      // Seed order for any new videos not yet in orderedIds
      setOrderedIds(prev => {
        const existing = new Set(prev);
        const newIds = (data as VideoMeta[]).filter(v => !existing.has(v.id)).map(v => v.id);
        if (newIds.length === 0) return prev;
        const merged = [...prev, ...newIds];
        localStorage.setItem('fittrack_video_order', JSON.stringify(merged));
        return merged;
      });
    }
    setLoading(false);
  }

  useEffect(() => { loadVideos(); }, []);

  async function handlePlay(video: VideoMeta) {
    if (playingId === video.id) {
      setPlayingUrl(null);
      setPlayingId(null);
      return;
    }
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(video.file_path, 3600);
    if (error || !data) { setError('Could not load video.'); return; }
    setPlayingUrl(data.signedUrl);
    setPlayingId(video.id);
  }

  function handleAddVideoClick() {
    if (!user) { setShowLoginPrompt(true); return; }
    setShowForm(s => !s);
    setError(null);
  }

  async function handleUpload() {
    if (!file || !name.trim() || !user) return;
    setUploading(true);
    setError(null);

    const videoId = crypto.randomUUID();
    const filePath = `${user.id}/${videoId}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from('exercise_videos').insert({
      id: videoId,
      uploaded_by: user.id,
      name: name.trim(),
      category,
      file_name: file.name,
      file_path: filePath,
      size: file.size,
      mime_type: file.type,
    });

    if (insertError) {
      setError(`Save failed: ${insertError.message}`);
      setUploading(false);
      return;
    }

    await loadVideos();
    setName('');
    setCategory('Other');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    setShowForm(false);
    setUploading(false);
  }

  async function handleDelete(video: VideoMeta) {
    if (!user) { setShowLoginPrompt(true); return; }
    await supabase.storage.from(BUCKET).remove([video.file_path]);
    await supabase.from('exercise_videos').delete().eq('id', video.id);
    if (playingId === video.id) {
      setPlayingUrl(null);
      setPlayingId(null);
    }
    setVideos(v => v.filter(x => x.id !== video.id));
    setOrderedIds(prev => {
      const next = prev.filter(id => id !== video.id);
      localStorage.setItem('fittrack_video_order', JSON.stringify(next));
      return next;
    });
  }

  async function handleRename(video: VideoMeta) {
    if (!editName.trim() || !user) return;
    const newName = editName.trim();
    await supabase.from('exercise_videos').update({ name: newName }).eq('id', video.id);
    setVideos(v => v.map(x => x.id === video.id ? { ...x, name: newName } : x));
    setEditingId(null);
    setEditName('');
  }

  function moveVideo(id: string, direction: 'up' | 'down') {
    const allIds = orderedIds.length > 0 ? [...orderedIds] : videos.map(v => v.id);
    for (const v of videos) {
      if (!allIds.includes(v.id)) allIds.push(v.id);
    }
    const idx = allIds.indexOf(id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= allIds.length) return;
    const newIds = [...allIds];
    [newIds[idx], newIds[swapIdx]] = [newIds[swapIdx], newIds[idx]];
    setOrderedIds(newIds);
    localStorage.setItem('fittrack_video_order', JSON.stringify(newIds));
  }

  const sortedVideos = useMemo(() => {
    if (orderedIds.length === 0) return videos;
    const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
    return [...videos].sort((a, b) => {
      const ai = orderMap.has(a.id) ? orderMap.get(a.id)! : orderedIds.length;
      const bi = orderMap.has(b.id) ? orderMap.get(b.id)! : orderedIds.length;
      return ai - bi;
    });
  }, [videos, orderedIds]);

  const filtered = filter === 'All' ? sortedVideos : sortedVideos.filter(v => v.category === filter);

  return (
    <div className="page">
      {showLoginPrompt && (
        <LoginPromptModal
          message="You need to be signed in to upload or manage videos. Sign in to add your exercise library!"
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Exercise Videos</h1>
        <button className="btn-primary" onClick={handleAddVideoClick}>
          <Plus size={16} /> Add Video
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>Upload New Video</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              className="input-date"
              style={{ fontFamily: 'inherit' }}
              placeholder="Video name (e.g. Push-up Tutorial)"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <select
              className="input-date"
              style={{ fontFamily: 'inherit', cursor: 'pointer' }}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div
              style={{
                border: `2px dashed ${file ? 'var(--accent-primary)' : 'var(--accent-secondary)'}`,
                borderRadius: '8px',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: file ? 'rgba(52,211,153,0.05)' : 'transparent',
                transition: 'all 0.2s',
              }}
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <span style={{ color: 'var(--accent-primary)', fontSize: '0.875rem' }}>
                  {file.name} &nbsp;·&nbsp; {formatSize(file.size)}
                </span>
              ) : (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Upload size={16} />
                  Click to choose a video file
                </span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {error && (
              <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn-primary"
                onClick={handleUpload}
                disabled={!file || !name.trim() || uploading}
              >
                {uploading ? 'Uploading…' : 'Save Video'}
              </button>
              <button className="btn-secondary" onClick={() => { setShowForm(false); setFile(null); setName(''); setError(null); }}>
                Cancel
              </button>
            </div>
            {uploading && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Uploading to cloud — large files may take a moment…
              </p>
            )}
          </div>
        </div>
      )}

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {ALL_FILTERS.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              border: '1px solid',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: filter === c ? 'var(--accent-secondary)' : 'transparent',
              borderColor: filter === c ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              color: filter === c ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Video list */}
      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading videos…</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Video size={44} color="var(--text-secondary)" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {videos.length === 0
              ? 'No videos yet — sign in and add your first exercise video.'
              : 'No videos in this category.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((v, _idx) => {
            const globalIdx = sortedVideos.findIndex(x => x.id === v.id);
            return (
            <div key={v.id} className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                {/* Reorder arrows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0, justifyContent: 'center' }}>
                  <button
                    style={{ background: 'none', border: 'none', cursor: globalIdx > 0 ? 'pointer' : 'default', color: globalIdx > 0 ? 'var(--text-secondary)' : 'rgba(255,255,255,0.1)', padding: '2px', display: 'flex' }}
                    onClick={() => moveVideo(v.id, 'up')}
                    title="Move up"
                    disabled={globalIdx === 0}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    style={{ background: 'none', border: 'none', cursor: globalIdx < sortedVideos.length - 1 ? 'pointer' : 'default', color: globalIdx < sortedVideos.length - 1 ? 'var(--text-secondary)' : 'rgba(255,255,255,0.1)', padding: '2px', display: 'flex' }}
                    onClick={() => moveVideo(v.id, 'down')}
                    title="Move down"
                    disabled={globalIdx >= sortedVideos.length - 1}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === v.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <input
                        className="input-date"
                        style={{ fontFamily: 'inherit', flex: 1, fontSize: '0.9rem' }}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(v); if (e.key === 'Escape') { setEditingId(null); setEditName(''); } }}
                        autoFocus
                      />
                      <button
                        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid var(--accent-primary)', borderRadius: '6px', cursor: 'pointer', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', padding: '0.3rem' }}
                        onClick={() => handleRename(v)}
                        title="Save name"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.3rem' }}
                        onClick={() => { setEditingId(null); setEditName(''); }}
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '1rem' }}>{v.name}</span>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: 'rgba(124,58,237,0.2)',
                        color: 'var(--accent-secondary)',
                        border: '1px solid rgba(124,58,237,0.4)',
                      }}>
                        {v.category}
                      </span>
                      {user && v.uploaded_by === user.id && (
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '2px' }}
                          onClick={() => { setEditingId(v.id); setEditName(v.name); }}
                          title="Rename video"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {v.file_name} &nbsp;·&nbsp; {formatSize(v.size)}
                  </div>
                  {v.uploaded_by !== user?.id && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <User size={11} /> shared by another user
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    style={{
                      background: playingId === v.id ? 'rgba(52,211,153,0.15)' : 'rgba(52,211,153,0.06)',
                      border: '1px solid var(--accent-primary)',
                      borderRadius: '6px',
                      padding: '0.4rem 0.75rem',
                      cursor: 'pointer',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.8rem',
                    }}
                    onClick={() => handlePlay(v)}
                  >
                    {playingId === v.id ? <X size={14} /> : <Play size={14} />}
                    {playingId === v.id ? 'Close' : 'Play'}
                  </button>
                  {user && v.uploaded_by === user.id && (
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.4rem' }}
                      onClick={() => handleDelete(v)}
                      title="Delete video"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline video player */}
              {playingId === v.id && playingUrl && (
                <div style={{ marginTop: '0.75rem' }}>
                  <video
                    src={playingUrl}
                    controls
                    autoPlay
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      background: '#000',
                      maxHeight: '420px',
                      display: 'block',
                    }}
                  />
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
