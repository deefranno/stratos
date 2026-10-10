import {
  ComposedChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import { formatMonthShort, formatMonth } from './ui';
import type { HistoryPoint } from '../lib/api';
import { formatMoney, formatPercent } from '@stratos/financial-engine';

export const COLORS = { primary: '#13a581', costs: '#3f5a52', fuel: '#13a682', fixed: '#3f5a52', variable: '#c39435', grid: '#e3e7e5', muted: '#4a4f4d' };

const money = (v: number) => formatMoney(v);
const pct = (v: number) => formatPercent(v);
const mpg = (v: number) => `${v.toFixed(2)} MPG`;
const cpm = (v: number) => `$${v.toFixed(2)}`;

const tooltipStyle = {
  background: '#fff', border: '1px solid #e3e7e5', borderRadius: 8,
  fontSize: 12, fontFamily: 'Archivo, sans-serif',
};

function Axis({ dataKey, formatter }: { dataKey: string; formatter?: (v: number) => string }) {
  return (
    <XAxis dataKey={dataKey} tick={{ fontSize: 10, fill: COLORS.muted }} tickFormatter={formatMonthShort} />
  );
}

export function RevenueVsCostsChart({ history }: { history: HistoryPoint[] }) {
  const data = history.map((h) => ({ month: h.reportingMonth, Revenue: h.revenue, 'Operating costs': h.totalOperatingCosts }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <Axis dataKey="month" />
        <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: COLORS.muted }} width={48} />
        <Tooltip formatter={money as never} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Revenue" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Operating costs" fill={COLORS.costs} radius={[4, 4, 0, 0]} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ProfitTrendChart({ history }: { history: HistoryPoint[] }) {
  const data = history.map((h) => ({ month: h.reportingMonth, Profit: h.estimatedMonthlyProfit }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <Axis dataKey="month" />
        <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} tick={{ fontSize: 10, fill: COLORS.muted }} width={48} />
        <Tooltip formatter={money as never} contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="Profit" stroke={COLORS.primary} strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PerMileChart({ history }: { history: HistoryPoint[] }) {
  const data = history.map((h) => ({
    month: h.reportingMonth,
    'Cost per mile': h.totalCostPerMile,
    'Revenue per mile': h.revenuePerMile,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <Axis dataKey="month" />
        <YAxis tickFormatter={(v: number) => `$${v.toFixed(2)}`} tick={{ fontSize: 10, fill: COLORS.muted }} width={48} />
        <Tooltip formatter={cpm as never} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="Cost per mile" stroke={COLORS.costs} strokeWidth={3} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="Revenue per mile" stroke={COLORS.primary} strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MpgChart({ history }: { history: HistoryPoint[] }) {
  const data = history.map((h) => ({ month: h.reportingMonth, MPG: h.mpg }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <Axis dataKey="month" />
        <YAxis tickFormatter={(v: number) => v.toFixed(1)} tick={{ fontSize: 10, fill: COLORS.muted }} width={48} domain={['auto', 'auto']} />
        <Tooltip formatter={mpg as never} contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="MPG" stroke={COLORS.primary} strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MarginTrendChart({ history }: { history: HistoryPoint[] }) {
  const data = history.map((h) => ({ month: h.reportingMonth, 'Profit margin': h.profitMarginPercent }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <Axis dataKey="month" />
        <YAxis tickFormatter={(v: number) => `${v.toFixed(0)}%`} tick={{ fontSize: 10, fill: COLORS.muted }} width={48} />
        <Tooltip formatter={pct as never} contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="Profit margin" stroke={COLORS.primary} strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Expense breakdown donut — fuel is its own segment and the three segments
 *  reconcile exactly with Total Operating Costs. */
export function ExpenseDonut({ fuel, fixed, variable, total }: { fuel: number; fixed: number; variable: number; total: number }) {
  const data = [
    { name: 'Fuel Spend', value: fuel, color: COLORS.fuel },
    { name: 'Fixed Costs', value: fixed, color: COLORS.fixed },
    { name: 'Variable Costs', value: variable, color: COLORS.variable },
  ];
  if (!total) return <p className="py-10 text-center text-sm text-muted">No operating expenses entered.</p>;
  return (
    <div>
      <div className="relative mx-auto h-[200px] w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} stroke="none"
              aria-label={`Expense breakdown: fuel ${money(fuel)}, fixed ${money(fixed)}, variable ${money(variable)}`}>
              {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={money as never} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Total costs</div>
            <div className="tabular text-lg font-extrabold">{money(total)}</div>
          </div>
        </div>
      </div>
      <div className="mt-3">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
            <span className="flex items-center gap-2 text-sm">
              <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: entry.color }} aria-hidden />
              {entry.name}
            </span>
            <b className="tabular text-sm">
              {money(entry.value)} <span className="muted font-medium">({((entry.value / total) * 100).toFixed(1)}%)</span>
            </b>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Fuel Spend + Fixed Costs + Variable Costs = {money(total)}
      </p>
    </div>
  );
}

export { formatMonth };
