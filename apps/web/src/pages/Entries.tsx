import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Card, EmptyState, Notice, formatMonthShort } from '../components/ui';
import { api, type Entry, type Truck } from '../lib/api';
import { formatMoney, formatPercent } from '@stratos/financial-engine';

export default function Entries() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [list, truckList] = await Promise.all([api.get<Entry[]>('/api/entries'), api.get<Truck[]>('/api/trucks')]);
      setEntries(list);
      setTrucks(truckList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load entries.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onDelete = async (entry: Entry) => {
    if (!window.confirm(`Delete the ${formatMonthShort(entry.reportingMonth)} entry?`)) return;
    try {
      await api.delete(`/api/entries/${entry.id}`);
      setNotice('Entry deleted.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  return (
    <>
      <PageHeader
        title="Monthly Entries"
        subtitle="Manage and review your monthly financial records."
        actions={
          <Link to="/entries/new" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark">
            <Plus size={16} aria-hidden /> Add Monthly Entry
          </Link>
        }
      />
      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}
      {notice && <div className="mb-4"><Notice kind="info">{notice}</Notice></div>}

      {!entries ? (
        <p className="text-sm text-muted" role="status">Loading entries…</p>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No monthly entries yet"
          message="Your financial results will appear after you save an entry."
          action={<Link to="/entries/new" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-brand px-4 font-bold text-white hover:bg-brand-dark">Add Monthly Entry</Link>}
        />
      ) : (
        <Card className="overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="px-5 pt-5 text-left text-[15px] font-bold">Monthly financial records</caption>
              <thead>
                <tr className="bg-tint text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">Month</th>
                  <th className="px-5 py-3">Truck</th>
                  <th className="px-5 py-3">Revenue</th>
                  <th className="px-5 py-3">Operating Costs</th>
                  <th className="px-5 py-3">Fuel Spend</th>
                  <th className="px-5 py-3">Profit</th>
                  <th className="px-5 py-3">Margin</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().map((entry) => (
                  <tr key={entry.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3.5 font-bold">{formatMonthShort(entry.reportingMonth)}</td>
                    <td className="px-5 py-3.5">{entry.truckName ?? 'Truck'}</td>
                    <td className="tabular px-5 py-3.5">{formatMoney(entry.metrics.revenue)}</td>
                    <td className="tabular px-5 py-3.5">{formatMoney(entry.metrics.totalOperatingCosts)}</td>
                    <td className="tabular px-5 py-3.5">{formatMoney(entry.metrics.fuelSpend)}</td>
                    <td className={`tabular px-5 py-3.5 font-bold ${entry.metrics.estimatedMonthlyProfit >= 0 ? 'text-brand-text' : 'text-danger'}`}>
                      {formatMoney(entry.metrics.estimatedMonthlyProfit)}
                    </td>
                    <td className="tabular px-5 py-3.5">{formatPercent(entry.metrics.profitMarginPercent)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <Link to={`/entries/${entry.id}/edit`} className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-line bg-white px-3 font-semibold text-brand-text">
                          <Pencil size={13} aria-hidden /> Edit
                        </Link>
                        <button type="button" onClick={() => onDelete(entry)}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-line bg-white px-3 font-semibold text-danger">
                          <Trash2 size={13} aria-hidden /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {trucks.length > 0 && (
        <p className="mt-4 text-xs text-muted">
          One record per truck and month — duplicates are blocked automatically.
          {trucks.map((t) => ` ${t.name}: ${t.entryCount} entries.`).join('')}
        </p>
      )}
    </>
  );
}
