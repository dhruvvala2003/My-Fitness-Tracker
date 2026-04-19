interface Props {
  label: string;
  value: number; // 0–100
  detail?: string;
}

export default function ProgressCard({ label, value, detail }: Props) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value">{value.toFixed(0)}%</div>
      {detail && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          {detail}
        </div>
      )}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
