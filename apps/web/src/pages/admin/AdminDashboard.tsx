import { useCallback, useEffect, useState } from 'react';
import { Users, CreditCard, DollarSign, FileText, LifeBuoy } from 'lucide-react';
import { PageHeader, Card, KpiCard, Notice } from '../../components/ui';
import { api, type AdminCustomer, type AdminMetrics, type AdminTicket, type AuditEntry } from '../../lib/api';
import { formatMonthShort, formatMonth } from '../../components/ui';

const TICKET_STATUS: Record<string, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, c, t, a] = await Promise.all([
        api.get<AdminMetrics>('/api/admin/metrics'),
        api.get<AdminCustomer[]>('/api/admin/customers'),
        api.get<AdminTicket[]>('/api/admin/tickets'),
        api.get<AuditEntry[]>('/api/admin/audit?limit=50'),
      ]);
      setMetrics(m); setCustomers(c); setTickets(t); setAudit(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load administration data.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const setTicketStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/admin/tickets/${id}`, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the ticket.');
    }
  };

  const toggleRole = async (customer: AdminCustomer) => {
    const next = customer.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
    if (!window.confirm(`Change ${customer.email} to ${next}?`)) return;
    try {
      await api.patch(`/api/admin/users/${customer.id}/role`, { role: next });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the role.');
    }
  };

  return (
    <>
      <PageHeader title="Stratos Administration" subtitle="Registered customers, subscriptions, revenue, support requests, and platform activity." />
      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard name="Registered Customers" value={String(metrics?.customers ?? '—')} hint="Total accounts" />
        <KpiCard name="Active Subscriptions" value={String(metrics?.activeSubscriptions ?? '—')} hint="Trialing or active" />
        <KpiCard name="Monthly Recurring Revenue" value={metrics ? `$${(metrics.monthlyRecurringRevenueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'} hint="Sum of active plans" />
        <KpiCard name="Monthly Entries Filed" value={String(metrics?.totalEntries ?? '—')} hint="Across all customers" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="flex items-center gap-2 px-5 pt-5 text-left text-[15px] font-bold">
                <Users size={16} aria-hidden /> Registered Customers
              </caption>
              <thead>
                <tr className="bg-tint text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">MRR</th>
                  <th className="px-5 py-3">Trucks</th>
                  <th className="px-5 py-3">Role</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="font-bold">{c.displayName}</div>
                      <div className="text-xs text-muted">{c.email}{c.businessName ? ` · ${c.businessName}` : ''}</div>
                    </td>
                    <td className="px-5 py-3.5">{c.subscription?.planName ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                        c.subscription && ['active', 'trialing'].includes(c.subscription.status) ? 'bg-brand-tint text-brand-text' : 'bg-warning-tint text-warning'
                      }`}>
                        {c.subscription?.status ?? 'inactive'}
                      </span>
                    </td>
                    <td className="tabular px-5 py-3.5">{c.subscription && ['active', 'trialing'].includes(c.subscription.status) ? `$${(c.subscription.priceCents / 100).toFixed(2)}` : '—'}</td>
                    <td className="tabular px-5 py-3.5">{c.truckCount}</td>
                    <td className="px-5 py-3.5">
                      <button type="button" onClick={() => toggleRole(c)}
                        className="rounded-md border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-brand-text">
                        {c.role}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="flex items-center gap-2 px-5 pt-5 text-left text-[15px] font-bold">
                <LifeBuoy size={16} aria-hidden /> Support Requests
              </caption>
              <thead>
                <tr className="bg-tint text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">Request</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="font-bold">{t.subject}</div>
                      <div className="text-xs text-muted">{t.customer} · {t.email}</div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{t.message}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <select aria-label={`Status for ${t.subject}`} value={t.status}
                        onChange={(e) => setTicketStatus(t.id, e.target.value)}
                        className="min-h-[36px] rounded-md border border-line bg-white px-2 text-xs font-bold">
                        {Object.entries(TICKET_STATUS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr><td className="px-5 py-6 text-sm text-muted" colSpan={2}>No support requests yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Card className="overflow-hidden !p-0">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="flex items-center gap-2 px-5 pt-5 text-left text-[15px] font-bold">
                <FileText size={16} aria-hidden /> Platform Activity (Audit Log)
              </caption>
              <thead>
                <tr className="bg-tint text-left text-[11px] uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((l) => (
                  <tr key={l.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-2.5 text-xs text-muted">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-2.5 font-semibold">{l.action}</td>
                    <td className="px-5 py-2.5 text-xs">{l.email ?? '—'}</td>
                    <td className="px-5 py-2.5 text-xs text-muted">{l.ipAddress ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
          <CreditCard size={20} className="text-brand" aria-hidden />
          <div><div className="text-xs text-muted">Billing</div><div className="text-sm font-bold">Stripe-managed</div></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
          <DollarSign size={20} className="text-brand" aria-hidden />
          <div><div className="text-xs text-muted">Plan</div><div className="text-sm font-bold">Owner-Operator $20</div></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
          <Users size={20} className="text-brand" aria-hidden />
          <div><div className="text-xs text-muted">Open tickets</div><div className="text-sm font-bold">{metrics?.ticketsByStatus?.open ?? 0}</div></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
          <FileText size={20} className="text-brand" aria-hidden />
          <div><div className="text-xs text-muted">Entries</div><div className="text-sm font-bold">{metrics?.totalEntries ?? 0}</div></div>
        </div>
      </div>
    </>
  );
}
