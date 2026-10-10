import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Notice } from '../components/ui';

const APP_NAME = 'Stratos Trucking Profit Navigator';

export default function Login() {
  const { signIn, userId, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && userId) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await signIn(String(form.get('email')), String(form.get('password')));
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
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
        <h1 className="text-center text-2xl font-extrabold">{APP_NAME}</h1>
        <p className="mt-1 text-center text-sm text-muted">Sign in to your owner-operator dashboard.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <Notice kind="error">{error}</Notice>}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-bold">Email Address</label>
            <input id="email" name="email" type="email" required autoComplete="email"
              className="min-h-[46px] w-full rounded-md border border-input-line bg-white px-3" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-bold">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password"
              className="min-h-[46px] w-full rounded-md border border-input-line bg-white px-3" />
          </div>
          <button type="submit" disabled={submitting}
            className="min-h-[46px] w-full rounded-md bg-brand px-4 font-bold text-white hover:bg-brand-dark disabled:opacity-60">
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          New to {APP_NAME}? <Link to="/register" className="font-bold text-brand-text underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
