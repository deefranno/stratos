import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { PageHeader, KpiCard, MonthSelector, EmptyState, Notice, formatMonth } from '../components/ui';
import { RevenueVsCostsChart, ProfitTrendChart } from '../components/charts';
import { useSummary } from '../lib/useSummary';
import { formatMoney, formatNumber, formatPercent, formatMpg } from '@stratos/financial-engine';

export default function Dashboard() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { summary, error, loading } = useSummary(month);

  useEffect(() => {
    if (!month && summary?.selectedMonth) setMonth(summary.selectedMonth);
  }, [summary, month]);

  if (loading) return <p className="text-sm text-muted" role="status">Loading dashboard…</p>;
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!summary || !summary.kpis || !summary.selectedMonth) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your trucking business performance at a glance." />
        <EmptyState
          title="No monthly entries yet"
          message="Add your first monthly entry to see revenue, costs, fuel efficiency, and profit metrics."
          action={<Link to="/entries/new" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-brand px-4 font-bold text-white hover:bg-brand-dark">＋ Add Monthly Entry</Link>}
        />
      </>
    );
  }

  const k = summary.kpis;
  const profitTone = k.estimatedMonthlyProfit >= 0 ? 'positive' : 'negative';

  return (
    <>
      <PageHeader
        title={`Dashboard — ${formatMonth(summary.selectedMonth)}`}
        subtitle="Welcome back! Here is your trucking business performance at a glance."
        actions={
          <>
            <MonthSelector months={summary.months} value={summary.selectedMonth} onChange={setMonth} />
            <Link to="/entries/new" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark">
              <Plus size={16} aria-hidden /> Add Monthly Entry
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard name="Total Revenue" value={formatMoney(k.revenue)} hint="Monthly gross revenue" />
        <KpiCard name="Total Operating Costs" value={formatMoney(k.totalOperatingCosts)} hint="Fuel + fixed + variable costs" />
        <KpiCard name="Estimated Monthly Profit" value={formatMoney(k.estimatedMonthlyProfit)} hint="Revenue minus operating costs" tone={profitTone} />
        <KpiCard name="Profit Margin" value={formatPercent(k.profitMarginPercent)} hint="Estimated operating margin" tone={profitTone} />
        <KpiCard name="Total Miles" value={formatNumber(k.totalMiles)} hint="Miles driven" />
        <KpiCard name="Fuel Efficiency (MPG)" value={k.mpg.toFixed(2)} hint="Miles per gallon" />
        <KpiCard name="Fuel Cost Per Mile" value={formatMoney(k.fuelCostPerMile)} hint="Fuel spend ÷ miles" />
        <KpiCard name="Total Cost Per Mile" value={formatMoney(k.totalCostPerMile)} hint="All operating costs ÷ miles (includes fuel)" />
        <KpiCard name="Revenue Per Mile" value={formatMoney(k.revenuePerMile)} hint="Revenue ÷ miles" />
        <KpiCard name="Estimated Profit Per Mile" value={formatMoney(k.estimatedProfitPerMile)} hint="Estimated earnings per mile" tone={profitTone} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_6px_22px_rgba(24,53,42,0.04)] sm:p-6">
          <h2 className="mb-4 text-[15px] font-bold">Revenue vs Operating Costs</h2>
          <RevenueVsCostsChart history={summary.history} />
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_6px_22px_rgba(24,53,42,0.04)] sm:p-6">
          <h2 className="mb-4 text-[15px] font-bold">Monthly Profit Trend</h2>
          <ProfitTrendChart history={summary.history} />
        </div>
      </div>

      <div className={`mt-5 flex items-center gap-4 rounded-xl border p-5 sm:p-6 ${k.estimatedMonthlyProfit >= 0 ? 'border-[#cdeedd] bg-brand-tint' : 'border-[#eab4ba] bg-danger-tint'}`}>
        <div className={`grid h-11 w-11 flex-none place-items-center rounded-full text-white ${k.estimatedMonthlyProfit >= 0 ? 'bg-brand' : 'bg-danger'}`}>
          {k.estimatedMonthlyProfit >= 0 ? <TrendingUp size={22} aria-hidden /> : <TrendingDown size={22} aria-hidden />}
        </div>
        <div>
          <strong className="text-base">Your Monthly Profit Checkup{k.estimatedMonthlyProfit < 0 ? ' — Operating loss' : ''}</strong>
          <p className="mt-1 text-sm text-muted">
            Your business generated <b className="tabular text-ink">{formatMoney(k.revenue)}</b> in revenue and incurred{' '}
            <b className="tabular text-ink">{formatMoney(k.totalOperatingCosts)}</b> in operating costs (including{' '}
            <b className="tabular text-ink">{formatMoney(k.fuelSpend)}</b> in fuel). Estimated monthly profit:{' '}
            <b className={`tabular ${profitTone === 'positive' ? 'text-brand-text' : 'text-danger'}`}>{formatMoney(k.estimatedMonthlyProfit)}</b>, a{' '}
            <b className="tabular text-ink">{formatPercent(k.profitMarginPercent)}</b> margin.
          </p>
        </div>
      </div>

      {k.notes.length > 0 && (
        <div className="mt-5">
          <Notice kind="info">
            {k.notes.map((note) => <span key={note} className="block">{note}</span>)}
            {k.mpg === 0 && <span className="block font-semibold">Fuel efficiency uses miles and gallons purchased — it is never derived from fuel spend.</span>}
          </Notice>
        </div>
      )}
    </>
  );
}
