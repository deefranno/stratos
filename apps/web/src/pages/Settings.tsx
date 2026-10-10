import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader, Card, Notice } from '../components/ui';
import { api, type AccountInfo } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { refreshAccount } = useAuth();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<AccountInfo>('/api/account').then(setAccount).catch(() => setAccount(null));
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setSaved(false); setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api.patch('/api/account', {
        displayName: String(form.get('displayName')),
        businessName: String(form.get('businessName')) || null,
        phone: String(form.get('phone')) || null,
      });
      await refreshAccount();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Account Settings" subtitle="Manage your profile and business details." />
      {!account ? (
        <p className="text-sm text-muted" role="status">Loading account…</p>
      ) : (
        <Card title="Profile Information" className="max-w-[680px]">
          {saved && <div className="mb-4"><Notice kind="info">Your changes have been saved.</Notice></div>}
          {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="displayName" className="mb-1.5 block text-xs font-bold">Full Name</label>
              <input id="displayName" name="displayName" defaultValue={account.client.displayName} required
                className="min-h-[46px] w-full rounded-md border border-input-line bg-white px-3" />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold">Email Address</label>
              <input id="email" value={account.user.email} disabled
                className="min-h-[46px] w-full rounded-md border border-line bg-tint px-3 text-muted" />
              <small className="mt-1 block text-muted">Contact support to change your sign-in email.</small>
            </div>
            <div>
              <label htmlFor="businessName" className="mb-1.5 block text-xs font-bold">Business Name</label>
              <input id="businessName" name="businessName" defaultValue={account.client.businessName ?? ''}
                className="min-h-[46px] w-full rounded-md border border-input-line bg-white px-3" />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-xs font-bold">Phone</label>
              <input id="phone" name="phone" defaultValue={account.client.phone ?? ''}
                className="min-h-[46px] w-full rounded-md border border-input-line bg-white px-3" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving}
                className="min-h-[44px] rounded-md bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
