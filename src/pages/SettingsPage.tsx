import { useState, useRef } from 'react';
import { Plus, Trash2, Download, Upload, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import { DEFAULT_DATA } from '../types';
import type { AppData } from '../types';
import { exportData, importData } from '../utils/dataExport';

export default function SettingsPage() {
  const [data, setData] = useLocalStorage<AppData>('fittrack_v2', DEFAULT_DATA);
  const [newCol, setNewCol] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const columns = data.habits.columns;
  // Safely read hiddenColumns — handles old data that didn't have this field
  const hiddenColumns: number[] = data.habits.hiddenColumns ?? [];

  function isHidden(idx: number) { return hiddenColumns.includes(idx); }

  function toggleVisibility(idx: number) {
    setData(prev => {
      const cur = prev.habits.hiddenColumns ?? [];
      const next = cur.includes(idx) ? cur.filter(h => h !== idx) : [...cur, idx];
      return { ...prev, habits: { ...prev.habits, hiddenColumns: next } };
    });
  }

  function addColumn() {
    const name = newCol.trim();
    if (!name || columns.length >= 4) return;
    setData(prev => ({ ...prev, habits: { ...prev.habits, columns: [...prev.habits.columns, name] } }));
    setNewCol('');
  }

  function deleteColumn(idx: number) {
    setData(prev => {
      const curHidden = prev.habits.hiddenColumns ?? [];
      return {
        ...prev,
        habits: {
          ...prev.habits,
          columns: prev.habits.columns.filter((_, i) => i !== idx),
          // Remove deleted index from hidden; shift indices above it down by 1
          hiddenColumns: curHidden
            .filter(h => h !== idx)
            .map(h => (h > idx ? h - 1 : h)),
          checks: Object.fromEntries(
            Object.entries(prev.habits.checks).map(([date, dayChecks]) => {
              const updated: Record<string, boolean> = {};
              Object.entries(dayChecks).forEach(([ci, val]) => {
                const n = Number(ci);
                if (n < idx) updated[ci] = val;
                else if (n > idx) updated[String(n - 1)] = val;
                // n === idx → deleted, skip
              });
              return [date, updated];
            })
          ),
        },
      };
    });
  }

  function renameColumn(idx: number, name: string) {
    setData(prev => ({
      ...prev,
      habits: {
        ...prev.habits,
        columns: prev.habits.columns.map((c, i) => (i === idx ? name : c)),
      },
    }));
  }

  async function handleImport(file: File) {
    setImportError(null);
    setImportSuccess(false);
    try {
      const imported = await importData(file);
      setData(imported);
      setImportSuccess(true);
    } catch (e) {
      setImportError((e as Error).message);
    }
  }

  function clearAllData() {
    setData(DEFAULT_DATA);
    setConfirmClear(false);
  }

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      {/* ── Habit Columns ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Habit Columns</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Up to 4 columns. Toggle the eye icon to hide/show a column — hidden columns are excluded
          from the table and all progress calculations, but their data is preserved.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {columns.map((col, i) => {
            const hidden = isHidden(i);
            return (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>

                {/* Visibility toggle */}
                <button
                  onClick={() => toggleVisibility(i)}
                  title={hidden ? 'Show column' : 'Hide column'}
                  style={{
                    flexShrink: 0,
                    width: 36, height: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: hidden ? 'rgba(255,71,87,0.08)' : 'rgba(0,255,157,0.08)',
                    border: `1px solid ${hidden ? 'rgba(255,71,87,0.3)' : 'rgba(0,255,157,0.25)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: hidden ? 'var(--accent-danger)' : 'var(--accent-primary)',
                    transition: 'all 160ms',
                  }}
                >
                  {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>

                {/* Name input — dimmed when hidden */}
                <input
                  className="input"
                  value={col}
                  onChange={e => renameColumn(i, e.target.value)}
                  maxLength={30}
                  style={{ opacity: hidden ? 0.45 : 1, transition: 'opacity 160ms' }}
                />

                {/* Hidden badge */}
                {hidden && (
                  <span style={{
                    flexShrink: 0, fontSize: '0.65rem', fontWeight: 700,
                    color: 'var(--accent-danger)', background: 'rgba(255,71,87,0.1)',
                    border: '1px solid rgba(255,71,87,0.25)',
                    borderRadius: 20, padding: '0.15rem 0.5rem',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    hidden
                  </span>
                )}

                {/* Delete */}
                <button
                  className="btn-danger"
                  style={{ padding: '0.5rem', flexShrink: 0 }}
                  onClick={() => deleteColumn(i)}
                  title="Permanently delete column"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
          {columns.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No columns. Add one below.</p>
          )}
        </div>

        {columns.length < 4 && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder='e.g. "Meditation"'
              value={newCol}
              onChange={e => setNewCol(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addColumn()}
              maxLength={30}
            />
            <button className="btn-primary" onClick={addColumn} style={{ flexShrink: 0 }}>
              <Plus size={15} /> Add
            </button>
          </div>
        )}
        {columns.length >= 4 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Maximum 4 columns reached.</p>
        )}
      </div>

      {/* ── Export / Import ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Data Backup</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Export your data as JSON for backup or cross-device sync. Import to restore.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => exportData(data)}>
            <Download size={15} /> Export JSON
          </button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import JSON
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />
        </div>
        {importSuccess && (
          <p style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', marginTop: '0.75rem' }}>Data imported successfully!</p>
        )}
        {importError && (
          <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: '0.75rem' }}>{importError}</p>
        )}
      </div>

      {/* ── Danger zone ── */}
      <div className="card" style={{ borderColor: 'rgba(255,71,87,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <AlertTriangle size={16} color="var(--accent-danger)" />
          <p style={{ fontWeight: 600, color: 'var(--accent-danger)' }}>Danger Zone</p>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Permanently delete all app data. This cannot be undone.
        </p>
        {confirmClear ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Are you sure?</span>
            <button className="btn-danger" onClick={clearAllData}>Yes, clear all</button>
            <button className="btn-secondary" onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn-danger" onClick={() => setConfirmClear(true)}>
            <Trash2 size={15} /> Clear All Data
          </button>
        )}
      </div>
    </div>
  );
}
