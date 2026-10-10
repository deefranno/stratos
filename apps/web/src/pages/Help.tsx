import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader, Card, Notice } from '../components/ui';
import { api, type Ticket } from '../lib/api';

const FAQS: [string, string][] = [
  ['How is estimated monthly profit calculated?', 'Revenue minus total operating costs, where total operating costs = Fuel Spend + Fixed Costs + Variable Costs. Fuel is included exactly once — it is never placed inside fixed or variable costs.'],
  ['How is MPG calculated?', 'Total miles driven divided by gallons purchased. MPG never uses fuel expenditure. If gallons are zero, MPG displays 0 with an explanation.'],
  ['What is Total Cost Per Mile?', '(Fuel Spend + Fixed Costs + Variable Costs) ÷ Total Miles. Fuel is always included.'],
  ['What is the Monthly Profit Checkup?', 'A summary strip on the dashboard showing revenue, operating costs, estimated monthly profit, and margin for the selected month.'],
  ['How do I edit an entry?', 'Open Monthly Entries and choose Edit next to the month. Every dependent metric recalculates automatically.'],
  ['Can I manage more trucks?', 'The Owner-Operator plan includes one truck. Small Fleet (up to 3) and Growing Fleet (up to 10) plans are planned for a future release.'],
  ['How do I download a PDF report?', 'Open Reports, choose the month, and select Download / Print PDF. In the print dialog choose “Save as PDF”.'],
];

const STATUS_LABEL: Record<string, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };

export default function Help() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = () => api.get<Ticket[]>('/api/support').then(setTickets).catch(() => setTickets([]));
  useEffect(() => { void load(); }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true); setError(null); setSent(false);
    try {
      await api.post('/api/support', { subject, message });
      setSent(true); setSubject(''); setMessage('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your request.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader title="Help & Support" subtitle="Answers to common questions and ways to get assistance." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Frequently Asked Questions">
          {FAQS.map(([q, a]) => (
            <details key={q} className="border-b border-line py-3 last:border-0">
              <summary className="cursor-pointer text-sm font-bold">{q}</summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </Card>
        <div className="space-y-4">
          <Card title="Contact Support">
            {sent && <div className="mb-4"><Notice kind="info">Your support request has been submitted. The Stratos team will follow up by email.</Notice></div>}
            {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="subject" className="mb-1.5 block text-xs font-bold">Subject</label>
                <input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={3}
                  className="min-h-[46px] w-full rounded-md border border-input-line bg-white px-3" />
              </div>
              <div>
                <label htmlFor="message" className="mb-1.5 block text-xs font-bold">How can we help?</label>
                <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} rows={4}
                  className="w-full rounded-md border border-input-line bg-white px-3 py-2.5" />
              </div>
              <button type="submit" disabled={sending}
                className="min-h-[44px] rounded-md bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">
                {sending ? 'Sending…' : 'Send Support Request'}
              </button>
            </form>
            <p className="mt-4 text-sm text-muted">
              Or email <a className="font-bold text-brand-text underline" href="mailto:info@stratosfinancials.com">info@stratosfinancials.com</a>.
            </p>
          </Card>

          {tickets.length > 0 && (
            <Card title="Your Requests">
              {tickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
                  <div>
                    <p className="text-sm font-bold">{t.subject}</p>
                    <p className="text-xs text-muted">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
                    t.status === 'resolved' ? 'bg-brand-tint text-brand-text' : t.status === 'in_progress' ? 'bg-warning-tint text-warning' : 'bg-tint text-muted'
                  }`}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
