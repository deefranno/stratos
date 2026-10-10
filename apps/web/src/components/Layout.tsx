import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Table2, PieChart, Fuel, TrendingUp, FileText,
  CreditCard, Settings, LifeBuoy, ShieldCheck, Menu, X, LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const APP_NAME = 'Stratos Trucking Profit Navigator';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/entries', label: 'Monthly Entries', icon: Table2 },
  { to: '/profit', label: 'Profit Analysis', icon: PieChart },
  { to: '/fuel', label: 'Fuel Efficiency', icon: Fuel },
  { to: '/trends', label: 'Financial Trends', icon: TrendingUp },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings', label: 'Account Settings', icon: Settings },
  { to: '/help', label: 'Help & Support', icon: LifeBuoy },
];

function Logo({ className = '' }: { className?: string }) {
  return <img src="/stratos-logo.webp" alt="Stratos Financial" width={220} height={139} className={className} />;
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  return (
    <div className="flex h-full flex-col bg-sidebar text-white">
      <div className="px-5 pt-5 pb-4">
        <div className="bg-white px-3 py-2.5">
          <Logo className="w-full max-w-[170px]" />
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-text">
          Trucking Profit Navigator
        </p>
      </div>
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 pb-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand text-white' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
              }`
            }
          >
            <Icon size={17} aria-hidden />
            {label}
          </NavLink>
        ))}
        {role === 'ADMIN' && (
          <NavLink
            to="/admin"
            onClick={onNavigate}
            className={({ isActive }) =>
              `mt-2 flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive ? 'bg-accent text-white' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
              }`
            }
          >
            <ShieldCheck size={17} aria-hidden />
            Stratos Administration
          </NavLink>
        )}
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-xs text-sidebar-text">
        <strong className="block text-white">Owner-Operator Plan</strong>
        $20/month · 1 truck
      </div>
    </div>
  );
}

export default function Layout() {
  const { userId, loading, account, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => setNavOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [navOpen]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-muted" role="status">
        Loading {APP_NAME}…
      </div>
    );
  }
  if (!userId) return <Navigate to="/login" replace />;

  const initials = (account?.client.displayName ?? nameFallback(account?.user.name))
    .split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[248px] flex-none lg:block">
        <Sidebar />
      </aside>

      {navOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden />
          <aside className="fixed inset-y-0 left-0 z-50 w-[260px] lg:hidden">
            <Sidebar onNavigate={() => setNavOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-line bg-surface px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-md border border-line bg-surface lg:hidden"
              onClick={() => setNavOpen((v) => !v)}
              aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={navOpen}
            >
              {navOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="text-sm font-bold">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold leading-tight">{account?.client.displayName ?? 'Account'}</div>
              <div className="text-xs text-muted">{role === 'ADMIN' ? 'Administrator' : 'Owner-Operator'}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-tint text-sm font-extrabold text-brand-text" aria-hidden>
              {initials || 'ST'}
            </div>
            <button
              type="button"
              onClick={async () => { await signOut(); navigate('/login'); }}
              className="grid h-11 w-11 place-items-center rounded-md border border-line bg-surface text-muted hover:text-danger"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-8" id="main" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="px-4 py-5 text-center text-[11px] uppercase tracking-wide text-muted sm:px-8">
          {APP_NAME} · Stratos Financials LLC
        </footer>
      </div>
    </div>
  );
}

function nameFallback(name?: string | null): string {
  return name && name.trim() ? name : 'Owner Operator';
}
