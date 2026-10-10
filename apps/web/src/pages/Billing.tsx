import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Card, Notice } from '../components/ui';
import { api, type BillingInfo } from '../lib/api';
import { formatMonth } from '../components/ui';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active', trialing: 'Trialing', past_due: 'Past due', canceled: 'Canceled', inactive: 'Not subscribed',
};

export default function Billing() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [params] = useSearchParams();

  const load = () => api.get<BillingInfo>('/api/billing').then(setBilling).catch((err) => setError(err instanceof Error ? err.message : 'Could not load billing.'));
  useEffect(() => { void load(); }, []);

  const checkout = async () => {
    setBusy(true); setError(null);
    try {
      const result = await api.post<{ url: string }>('/api/billing/checkout', { planCode: 'OWNER_OPERATOR' });
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
      setBusy(false);
    }
  };

  const portal = async () => {
    setBusy(true); setError(null);
    try {
      const result = await api.post<{ url: string }>('/api/billing/portal');
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message: 'Could not open the billing portal.');
      setBusy(false);
    }
  };

  const checkoutStatus = params.get('checkout');

  return (
    <>
      <PageHeader title="Billing & Subscription" subtitle="Manage your plan and view subscription information." />
      {checkoutStatus === 'success' && <div className="mb-4"><Notice kind="info">Thank you! Your subscription is activating — the status updates automatically once Stripe confirms payment.</Notice></div>}
      {checkoutStatus === 'cancelled' && <div className="mb-4"><Notice kind="warning">Checkout was cancelled. No charge was made.</Notice></div>}
      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}

      {!billing ? (
        <p className="text-sm text-muted" role="status">Loading billing…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand">Current Plan</p>
            <h2 className="mt-2 text-2xl font-extrabold">{billing.subscription?.plan.name ?? 'Owner-Operator'}</h2>
            <p className="tabular mt-1 text-3xl font-extrabold">
              ${((billing.subscription?.plan.priceCents ?? 2000) / 100).toFixed(0)}
              <span className="text-sm font-medium text-muted"> / month</span>
            </p>
            <p className="mt-3">
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-extrabold ${
                billing.subscription && ['active', 'trialing'].includes(billing.subscription.status)
                  ? 'bg-brand-tint text-brand-text' : 'bg-warning-tint text-warning'
              }`}>
                {STATUS_LABELS[billing.subscription?.status ?? 'inactive'] ?? billing.subscription?.status}
              </span>
            </p>
            {billing.subscription?.currentPeriodEnd && (
              <p className="mt-2 text-sm text-muted">
                {billing.subscription.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'} {formatMonth(billing.subscription.currentPeriodEnd.slice(0, 7))}
              </p>
            )}
            <p className="mt-3 text-sm text-muted">Includes one truck, unlimited monthly entries, trend charts, and printable reports.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {!billing.paymentsConfigured ? (
                <p className="text-sm text-muted">
                  Online payments activate once Stripe is connected in test mode. Your account currently has full access during development.
                </p>
              ) : billing.subscription && ['active', 'trialing'].includes(billing.subscription.status) ? (
                <button type="button" onClick={portal} disabled={busy}
                  className="min-h-[44px] rounded-md border border-line bg-surface px-5 text-sm font-bold disabled:opacity-60">
                  {busy ? 'Opening…' : 'Manage Subscription'}
                </button>
              ) : (
                <button type="button" onClick={checkout} disabled={busy}
                  className="min-h-[44px] rounded-md bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">
                  {busy ? 'Redirecting…' : 'Subscribe — $20/month'}
                </button>
              )}
            </div>
          </Card>

          <Card title="Plans">
            <div className="space-y-3">
              {billing.plans.map((plan) => (
                <div key={plan.code} className={`rounded-lg border p-4 ${plan.active ? 'border-brand bg-brand-tint/40' : 'border-line bg-tint/40'}`}>
                  <div className="flex items-baseline justify-between">
                    <strong className="text-sm">{plan.name}</strong>
                    <span className="tabular font-extrabold">${(plan.priceCents / 100).toFixed(0)}<span className="text-xs font-medium text-muted">/mo</span></span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{plan.description}</p>
                  <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide">
                    {plan.active ? (billing.subscription?.plan.code === plan.code ? 'Your plan' : 'Available now') : 'Coming soon'}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              All billing is processed securely by Stripe. This application never stores card numbers.
            </p>
          </Card>
        </div>
      )}
    </>
  );
}
