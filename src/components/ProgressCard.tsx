import { TiltCard, CountUp } from './effects';

interface Props {
  label: string;
  value: number; // 0–100
  detail?: string;
  delay?: number; // staggered entrance delay in ms
}

export default function ProgressCard({ label, value, detail, delay = 0 }: Props) {
  return (
    <TiltCard className="card stagger-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="card-label">{label}</div>
      <div className="card-value">
        <CountUp value={Math.round(value)} suffix="%" />
      </div>
      {detail && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          {detail}
        </div>
      )}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${value}%` }} />
      </div>
    </TiltCard>
  );
}
