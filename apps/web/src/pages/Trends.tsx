import { PageHeader, EmptyState, Notice } from '../components/ui';
import { RevenueVsCostsChart, ProfitTrendChart, PerMileChart, MpgChart, MarginTrendChart } from '../components/charts';
import { useSummary } from '../lib/useSummary';

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_6px_22px_rgba(24,53,42,0.04)] sm:p-6">
      <h2 className="mb-4 text-[15px] font-bold">{title}</h2>
      {children}
    </div>
  );
}

export default function Trends() {
  const { summary, error, loading } = useSummary();

  if (loading) return <p className="text-sm text-muted" role="status">Loading trends…</p>;
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!summary || summary.history.length === 0) {
    return (
      <>
        <PageHeader title="Financial Trends" subtitle="Explore monthly changes in profitability and performance." />
        <EmptyState title="No monthly entries yet" message="Trend charts appear after you save at least one monthly entry." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Financial Trends"
        subtitle={`Actual historical data from your saved entries (${summary.history.length} month${summary.history.length === 1 ? '' : 's'}).`}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Revenue vs Operating Costs"><RevenueVsCostsChart history={summary.history} /></ChartCard>
        <ChartCard title="Monthly Profit Trend"><ProfitTrendChart history={summary.history} /></ChartCard>
        <ChartCard title="Cost Per Mile vs Revenue Per Mile"><PerMileChart history={summary.history} /></ChartCard>
        <ChartCard title="Fuel Efficiency (MPG)"><MpgChart history={summary.history} /></ChartCard>
        <ChartCard title="Profit Margin Trend"><MarginTrendChart history={summary.history} /></ChartCard>
      </div>
    </>
  );
}
