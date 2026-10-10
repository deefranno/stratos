import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { PageHeader, MonthSelector, EmptyState, Notice, formatMonth } from '../components/ui';
import { useSummary } from '../lib/useSummary';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatNumber, formatPercent, APP_NAME } from '@stratos/financial-engine';

const Row = ({ label, value }: { label: string; value: string }) => (
  <tr className="border-b border-line last:border-0">
    <th scope="row" className="py-2.5 pr-4 text-left text-sm font-semibold">{label}</th>
    <td className="tabular py-2.5 text-right text-sm font-bold">{value}</td>
  </tr>
);

export default function Reports() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { summary, error, loading } = useSummary(month);
  const { account } = useAuth();
  useEffect(() => {
    if (!month && summary?.selectedMonth) setMonth(summary.selectedMonth);
  }, [summary, month]);

  if (loading) return <p className="text-sm text-muted" role="status">Loading reports…</p>;
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!summary || !summary.kpis || !summary.selectedMonth) {
    return (
      <>
        <PageHeader title="Reports" subtitle="Download a printable monthly financial summary." />
        <EmptyState title="No monthly entries yet" message="Add a monthly entry before generating a report." />
      </>
    );
  }

  const k = summary.kpis;
  const monthLabel = formatMonth(summary.selectedMonth);

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Reports"
          subtitle="Choose the reporting month, then download or print your financial summary."
          actions={
            <>
              <MonthSelector months={summary.months} value={summary.selectedMonth} onChange={setMonth} />
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark"
              >
                <Printer size={16} aria-hidden /> Download / Print PDF
              </button>
            </>
          }
        />
        <Notice kind="info">In the print dialog, choose <b>Save as PDF</b>. The report below is exactly what will be printed.</Notice>
      </div>

      {/* Print sheet — uses the same engine-computed values as the dashboard. */}
      <article className="print-sheet mx-auto mt-6 max-w-[820px] rounded-xl border border-line bg-surface p-6 shadow-[0_6px_22px_rgba(24,53,42,0.04)] sm:p-10">
        <header className="flex items-center gap-6 border-b-[3px] border-brand pb-5">
          <img src="/stratos-logo.webp" alt="Stratos Financial" width={220} height={139} className="w-[150px] shrink-0" />
          <div>
            <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">{APP_NAME}</h1>
            <p className="mt-1 text-sm text-muted">Monthly Trucking Performance Report</p>
          </div>
        </header>

        <p className="mt-5 text-sm">
          <b>{account?.client.displayName ?? 'Owner-Operator'}</b> · Owner-Operator
          {account?.client.businessName ? ` · ${account.client.businessName}` : ''}
          <br />
          <b>Reporting Month: {monthLabel}</b>
        </p>

        <h2 className="mt-6 mb-2 text-base font-extrabold text-brand-text">Financial Summary</h2>
        <table aria-label="Monthly financial metrics" className="w-full border-collapse">
          <tbody>
            <Row label="Revenue" value={formatMoney(k.revenue)} />
            <Row label="Fuel Spend" value={formatMoney(k.fuelSpend)} />
            <Row label="Fixed Costs" value={formatMoney(k.fixedCosts)} />
            <Row label="Variable Costs" value={formatMoney(k.variableCosts)} />
            <Row label="Total Operating Costs" value={formatMoney(k.totalOperatingCosts)} />
            <Row label="Estimated Monthly Profit" value={formatMoney(k.estimatedMonthlyProfit)} />
            <Row label="Profit Margin" value={formatPercent(k.profitMarginPercent)} />
            <Row label="Total Miles" value={formatNumber(k.totalMiles)} />
            <Row label="MPG" value={k.mpg.toFixed(2)} />
            <Row label="Fuel Cost Per Mile" value={formatMoney(k.fuelCostPerMile)} />
            <Row label="Total Cost Per Mile" value={formatMoney(k.totalCostPerMile)} />
            <Row label="Revenue Per Mile" value={formatMoney(k.revenuePerMile)} />
            <Row label="Estimated Profit Per Mile" value={formatMoney(k.estimatedProfitPerMile)} />
          </tbody>
        </table>

        <h2 className="mt-7 mb-2 text-base font-extrabold text-brand-text">Expense Breakdown</h2>
        <table aria-label="Expense breakdown" className="w-full border-collapse">
          <tbody>
            <Row label="Fuel Spend" value={formatMoney(k.fuelSpend)} />
            <Row label="Fixed Costs" value={formatMoney(k.fixedCosts)} />
            <Row label="Variable Costs" value={formatMoney(k.variableCosts)} />
          </tbody>
        </table>
        <p className="mt-4 rounded-lg bg-brand-tint px-4 py-3 text-sm font-bold">
          Fuel Spend + Fixed Costs + Variable Costs = Total Operating Costs
          <br />
          {formatMoney(k.fuelSpend)} + {formatMoney(k.fixedCosts)} + {formatMoney(k.variableCosts)} = {formatMoney(k.totalOperatingCosts)}
        </p>

        {k.notes.length > 0 && (
          <p className="mt-4 text-xs text-muted">{k.notes.join(' ')}</p>
        )}
        <p className="mt-6 text-[11px] text-muted">
          Generated by {APP_NAME} · Stratos Financials LLC · Not an audited financial statement.
        </p>
      </article>
    </>
  );
}
