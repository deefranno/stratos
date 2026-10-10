import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Notice } from '../components/ui';

const APP_NAME = 'Stratos Trucking Profit Navigator';

export default function Register() {
  const { signUp, userId, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && userId) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name'));
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    const confirm = String(form.get('confirm'));
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await signUp(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-[470px] rounded-2xl border border-line bg-surface p-8 shadow-[0_6px_22px_rgba(24,53,42,0.06)]">
        <div className="mx-auto mb-5 w-fit bg-white px-3 py-2">
          <img src="/stratos-logo.webp" alt="Stratos Financial" width={220} height={139} className="w-[185px]" />
        </div>
        <h1 className="text-center text-2xl font-extrabold">Create your account</h1>
        <p className="mt-1 text-center text-sm text-muted">{APP_NAME} · Owner-Operator plan, $20/month</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <Notice kind="error">{error}</Notice>}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-xs font-bold">Full Name</label>
            <input id="name" name="name" required autoComplete="name"
              className="min-h-[46px] w-full rounded-md border border-input-line bg-white px-3" />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-bold">Email Address</label>
            <input id="email" name="email" type="email" required autoComplete="email"
              className="min-h-[46px] w-full rounded-md border border-input-line bg-white px-3" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-bold">Password</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password"
              className="min-h-[46px] w-full rounded-md border border-input-line bg-white px-3" />
            <small className="mt-1 block text-muted">At least 8 characters.</small>
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1.5 block text-xs font-bold">Confirm Password</label>
            <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password"
              className="min-h-[46px] w-full rounded-md border border-input-line bg-white px-3" />
          </div>
          <button type="submit" disabled={submitting}
            className="min-h-[46px] w-full rounded-md bg-brand px-4 font-bold text-white hover:bg-brand-dark disabled:opacity-60">
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          Already registered? <Link to="/login" className="font-bold text-brand-text underline">Sign in</Link>
        </p>
        <p className="mt-3 text-center text-[11px] text-muted">
          Billing activates after Stripe is connected. No live charges during development.
        </p>
      </div>
    </div>
  );
}
