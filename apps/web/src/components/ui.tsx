import type { ReactNode } from 'react';

export const APP_NAME = 'Stratos Trucking Profit Navigator';

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand">{APP_NAME}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-[29px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  name, value, hint, tone = 'neutral',
}: { name: string; value: string; hint?: string; tone?: 'positive' | 'negative' | 'neutral' }) {
  const toneClass = tone === 'positive' ? 'text-brand-text' : tone === 'negative' ? 'text-danger' : '';
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_6px_22px_rgba(24,53,42,0.04)]">
      <div className="text-xs font-semibold text-muted">{name}</div>
      <div className={`tabular mt-2 text-[25px] font-extrabold tracking-tight ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 shadow-[0_6px_22px_rgba(24,53,42,0.04)] sm:p-6 ${className}`}>
      {title && <h2 className="mb-4 border-b border-line pb-3 text-[15px] font-bold">{title}</h2>}
      {children}
    </section>
  );
}

export function MonthSelector({
  months, value, onChange, label = 'Reporting month',
}: { months: string[]; value: string; onChange: (month: string) => void; label?: string }) {
  return (
    <select
      aria-label={label}
      className="min-h-[44px] rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {months.map((m) => (
        <option key={m} value={m}>{formatMonth(m)}</option>
      ))}
    </select>
  );
}

export function SummaryLine({ label, value, strong = false, tone }: { label: string; value: string; strong?: boolean; tone?: 'positive' | 'negative' }) {
  const toneClass = tone === 'positive' ? 'text-brand-text' : tone === 'negative' ? 'text-danger' : '';
  return (
    <div className="flex items-center justify-between gap-5 border-b border-line py-2.5 last:border-0">
      <span className={`text-sm ${strong ? 'font-bold' : ''}`}>{label}</span>
      <b className={`tabular text-right ${strong ? 'text-base' : 'text-sm'} ${toneClass}`}>{value}</b>
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
      <strong className="block text-base">{title}</strong>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ kind, children }: { kind: 'warning' | 'info' | 'error'; children: ReactNode }) {
  const cls =
    kind === 'warning' ? 'border-[#edddb4] bg-warning-tint text-warning'
    : kind === 'error' ? 'border-[#eab4ba] bg-danger-tint text-danger'
    : 'border-[#bbdfd1] bg-brand-tint text-brand-text';
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export function formatMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  if (!y || !m) return yyyymm;
  return new Date(y, m - 1, 2).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatMonthShort(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  if (!y || !m) return yyyymm;
  return new Date(y, m - 1, 2).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
