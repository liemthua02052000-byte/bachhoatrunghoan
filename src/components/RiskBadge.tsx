import type { RiskLevel } from '@/lib/types';

const config: Record<RiskLevel, { label: string; color: string; bg: string; border: string; text: string }> = {
  low: {
    label: 'Thấp',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'An toàn',
  },
  medium: {
    label: 'Trung bình',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'Nghi ngờ',
  },
  high: {
    label: 'Cao',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'Nguy hiểm',
  },
  critical: {
    label: 'Nghiêm trọng',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'Rất nguy hiểm',
  },
};

interface Props {
  score: number;
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

export function RiskBadge({ score, level, size = 'md' }: Props) {
  const c = config[level];
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-4 py-2' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${c.bg} ${c.border} ${c.color} ${sizeClass}`}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'currentColor' }} />
      {c.label} · {score}/100
    </span>
  );
}

export function RiskGauge({ score, level }: Props) {
  const c = config[level];
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
        <circle cx="65" cy="65" r="52" fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-200" />
        <circle
          cx="65"
          cy="65"
          r="52"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={c.color + ' transition-all duration-700'}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${c.color}`}>{score}</span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>
    </div>
  );
}

export { config as riskConfig };
