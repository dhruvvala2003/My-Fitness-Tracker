import { useState, useRef } from 'react';
import { Upload, Zap, Edit2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAppData } from '../context/DataContext';
import type { CalorieEntry } from '../types';
import { today } from '../utils/dateHelpers';
import { analyzeFood, fileToBase64 } from '../utils/aiCalories';

export default function CaloriesPage() {
  const { data, logMeal, deleteMeal } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [grams, setGrams] = useState<number>(100);
  const [estimatedCal, setEstimatedCal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealName, setMealName] = useState('');
  const [editingGrams, setEditingGrams] = useState(false);
  const [gramsInput, setGramsInput] = useState('100');

  const todayStr = today();
  const todayLog: CalorieEntry[] = data.calorieLog[todayStr] ?? [];
  const totalCal = todayLog.reduce((s, e) => s + e.calories, 0);

  async function handleFileChange(file: File) {
    if (!file.type.startsWith('image/')) return;
    setImagePreview(URL.createObjectURL(file));
    setEstimatedCal(null);
    setMealName('');
    setError(null);
    const { base64, mimeType } = await fileToBase64(file);
    setImageBase64(base64);
    setImageMime(mimeType);
  }

  async function runAnalysis(g: number) {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeFood(imageBase64, imageMime, g);
      setEstimatedCal(result.calories);
      if (!mealName) setMealName(result.name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function commitGrams() {
    const g = Math.max(1, parseInt(gramsInput) || 100);
    setGrams(g);
    setGramsInput(String(g));
    setEditingGrams(false);
    if (imageBase64 && estimatedCal !== null) runAnalysis(g);
  }

  async function handleLogMeal() {
    if (estimatedCal === null) return;
    const entry: CalorieEntry = {
      id: uuidv4(),
      name: mealName.trim() || 'Food',
      amount: grams,
      calories: estimatedCal,
      time: new Date().toTimeString().slice(0, 5),
    };
    await logMeal(entry, todayStr);
    setImagePreview(null);
    setImageBase64('');
    setEstimatedCal(null);
    setMealName('');
    setGrams(100);
    setGramsInput('100');
    setEditingGrams(false);
  }

  return (
    <div className="page">
      <h1 className="page-title">Calories</h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-label">Today's Total</div>
          <div className="card-value">{totalCal}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>kcal</div>
        </div>
        <div className="card">
          <div className="card-label">Meals Logged</div>
          <div className="card-value" style={{ color: 'var(--accent-secondary)' }}>{todayLog.length}</div>
        </div>
      </div>

      {/* Upload & analyze */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Analyze Food Photo</p>

        <div
          className="dropzone"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileChange(f); }}
        >
          {imagePreview ? (
            <img src={imagePreview} alt="Food" style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
          ) : (
            <>
              <Upload size={36} color="var(--accent-primary)" style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Click or drag & drop a food photo</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.6 }}>JPG, PNG, WEBP supported</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }} />

        {imagePreview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            {/* Gram input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Amount:</span>
              {editingGrams ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number" className="input" style={{ width: '90px' }}
                    value={gramsInput} min={1} autoFocus
                    onChange={e => setGramsInput(e.target.value)}
                    onBlur={commitGrams}
                    onKeyDown={e => e.key === 'Enter' && commitGrams()}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>g</span>
                </div>
              ) : (
                <span
                  onClick={() => { setEditingGrams(true); setGramsInput(String(grams)); }}
                  style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', borderBottom: '1px dashed rgba(0,255,157,0.4)', paddingBottom: '1px' }}
                >
                  {grams}g <Edit2 size={12} />
                </span>
              )}
            </div>

            {/* Meal name */}
            <input
              className="input"
              placeholder="Food name (auto-detected after analysis)"
              value={mealName}
              onChange={e => setMealName(e.target.value)}
            />

            {/* Result */}
            {estimatedCal !== null && (
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '0.875rem 1rem', border: '1px solid rgba(0,255,157,0.15)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                  Estimated for {grams}g
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-primary)', fontSize: '2rem', fontWeight: 700 }}>
                  {estimatedCal}
                </span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>kcal</span>
              </div>
            )}

            {error && (
              <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', padding: '0.75rem', background: 'rgba(255,71,87,0.08)', borderRadius: '8px', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => runAnalysis(grams)} disabled={loading}>
                {loading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={15} />}
                {loading ? 'Analyzing...' : estimatedCal !== null ? 'Re-analyze' : 'Analyze'}
              </button>
              {estimatedCal !== null && (
                <button className="btn-secondary" onClick={handleLogMeal}>
                  <Plus size={15} /> Log Meal
                </button>
              )}
              <button className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => { setImagePreview(null); setImageBase64(''); setEstimatedCal(null); setMealName(''); setError(null); }}>
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Today's log */}
      <div className="card">
        <p style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Today's Log</p>
        {todayLog.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No meals logged today.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {todayLog.map(entry => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{entry.name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{entry.amount}g · {entry.time}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-primary)', fontWeight: 600 }}>{entry.calories} kcal</span>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: '0.25rem' }} onClick={() => deleteMeal(entry.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.625rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Total</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-primary)' }}>{totalCal} kcal</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
