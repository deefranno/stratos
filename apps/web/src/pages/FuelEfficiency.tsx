import { useEffect, useState } from 'react';
import { PageHeader, KpiCard, MonthSelector, EmptyState, Notice } from '../components/ui';
import { MpgChart, PerMileChart } from '../components/charts';
import { useSummary } from '../lib/useSummary';
import { formatMoney, formatNumber } from '@stratos/financial-engine';

export default function FuelEfficiency() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { summary, error, loading } = useSummary(month);
  useEffect(() => {
    if (!month && summary?.selectedMonth) setMonth(summary.selectedMonth);
  }, [summary, month]);

  if (loading) return <p className="text-sm text-muted" role="status">Loading fuel efficiency…</p>;
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!summary || !summary.kpis || !summary.selectedMonth) {
    return (
      <>
        <PageHeader title="Fuel Efficiency" subtitle="Track mileage, fuel spending, and miles per gallon." />
        <EmptyState title="No monthly entries yet" message="Add a monthly entry to see fuel efficiency reporting." />
      </>
    );
  }
  const k = summary.kpis;

  return (
    <>
      <PageHeader
        title="Fuel Efficiency"
        subtitle="MPG uses miles driven and gallons purchased — never fuel expenditure."
        actions={<MonthSelector months={summary.months} value={summary.selectedMonth} onChange={setMonth} />}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard name="Miles Driven" value={formatNumber(k.totalMiles)} />
        <KpiCard name="Gallons Purchased" value={formatNumber(k.gallonsPurchased)} />
        <KpiCard name="Average MPG" value={k.mpg.toFixed(2)} hint={k.mpg === 0 ? 'No fuel-efficiency data for this month' : 'Miles per gallon'} />
        <KpiCard name="Fuel Cost Per Mile" value={formatMoney(k.fuelCostPerMile)} hint="Fuel spend ÷ miles" />
      </div>
      {k.mpg === 0 && (
        <div className="mt-5">
          <Notice kind="info">
            MPG displays 0 when gallons purchased are zero or missing. Enter gallons purchased with your fuel spend to enable fuel-efficiency reporting.
          </Notice>
        </div>
      )}
      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_6px_22px_rgba(24,53,42,0.04)] sm:p-6">
          <h2 className="mb-4 text-[15px] font-bold">Fuel Efficiency Trend (MPG)</h2>
          <MpgChart history={summary.history} />
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_6px_22px_rgba(24,53,42,0.04)] sm:p-6">
          <h2 className="mb-4 text-[15px] font-bold">Cost Per Mile vs Revenue Per Mile</h2>
          <PerMileChart history={summary.history} />
        </div>
      </div>
    </>
  );
}
