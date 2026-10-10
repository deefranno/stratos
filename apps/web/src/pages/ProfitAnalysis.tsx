import { useEffect, useState } from 'react';
import { PageHeader, KpiCard, Card, SummaryLine, MonthSelector, EmptyState, Notice } from '../components/ui';
import { RevenueVsCostsChart, ProfitTrendChart, ExpenseDonut } from '../components/charts';
import { useSummary } from '../lib/useSummary';
import { formatMoney, formatPercent } from '@stratos/financial-engine';

export default function ProfitAnalysis() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { summary, error, loading } = useSummary(month);
  useEffect(() => {
    if (!month && summary?.selectedMonth) setMonth(summary.selectedMonth);
  }, [summary, month]);

  if (loading) return <p className="text-sm text-muted" role="status">Loading profit analysis…</p>;
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!summary || !summary.kpis || !summary.selectedMonth) {
    return (
      <>
        <PageHeader title="Profit Analysis" subtitle="Understand where your money goes and how much you keep." />
        <EmptyState title="No monthly entries yet" message="Add a monthly entry to see your profit analysis." />
      </>
    );
  }

  const k = summary.kpis;
  const tone = k.estimatedMonthlyProfit >= 0 ? 'positive' : 'negative';

  return (
    <>
      <PageHeader
        title="Profit Analysis"
        subtitle="Understand where your money goes and how much you keep."
        actions={<MonthSelector months={summary.months} value={summary.selectedMonth} onChange={setMonth} />}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard name="Revenue" value={formatMoney(k.revenue)} />
        <KpiCard name="Total Operating Costs" value={formatMoney(k.totalOperatingCosts)} hint="Includes fuel spend" />
        <KpiCard name="Estimated Monthly Profit" value={formatMoney(k.estimatedMonthlyProfit)} tone={tone} />
        <KpiCard name="Profit Margin" value={formatPercent(k.profitMarginPercent)} tone={tone} />
        <KpiCard name="Estimated Profit Per Mile" value={formatMoney(k.estimatedProfitPerMile)} tone={tone} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Profitability Summary">
          <SummaryLine label="Revenue" value={formatMoney(k.revenue)} />
          <SummaryLine label="Fuel Spend" value={formatMoney(k.fuelSpend)} />
          <SummaryLine label="Fixed Costs" value={formatMoney(k.fixedCosts)} />
          <SummaryLine label="Variable Costs" value={formatMoney(k.variableCosts)} />
          <SummaryLine label="Total Operating Costs" value={formatMoney(k.totalOperatingCosts)} strong />
          <SummaryLine label="Estimated Monthly Profit" value={formatMoney(k.estimatedMonthlyProfit)} strong tone={tone} />
          <SummaryLine label="Profit Margin" value={formatPercent(k.profitMarginPercent)} />
          <SummaryLine label="Estimated Profit Per Mile" value={formatMoney(k.estimatedProfitPerMile)} />
        </Card>
        <Card title="Expense Breakdown">
          <ExpenseDonut fuel={k.fuelSpend} fixed={k.fixedCosts} variable={k.variableCosts} total={k.totalOperatingCosts} />
        </Card>
      </div>

      {k.notes.length > 0 && <div className="mt-5"><Notice kind="info">{k.notes.map((n) => <span key={n} className="block">{n}</span>)}</Notice></div>}

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_6px_22px_rgba(24,53,42,0.04)] sm:p-6">
          <h2 className="mb-4 text-[15px] font-bold">Revenue vs Operating Costs</h2>
          <RevenueVsCostsChart history={summary.history} />
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_6px_22px_rgba(24,53,42,0.04)] sm:p-6">
          <h2 className="mb-4 text-[15px] font-bold">Monthly Profit Trend</h2>
          <ProfitTrendChart history={summary.history} />
        </div>
      </div>
    </>
  );
}
