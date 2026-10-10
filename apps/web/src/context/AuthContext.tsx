import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authClient, signIn as doSignIn, signUp as doSignUp, signOut as doSignOut } from '../lib/auth-client';
import { api, type AccountInfo } from '../lib/api';

interface AuthState {
  loading: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  role: 'CUSTOMER' | 'ADMIN' | null;
  account: AccountInfo | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<'CUSTOMER' | 'ADMIN' | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);

  const refreshAccount = useCallback(async () => {
    try {
      const info = await api.get<AccountInfo>('/api/account');
      setAccount(info);
      setRole(info.user.role);
      setName(info.client.displayName);
      setEmail(info.user.email);
    } catch {
      setAccount(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    authClient
      .getSession()
      .then(async (result) => {
        if (!active) return;
        const sessionUser = result?.data?.user;
        if (sessionUser) {
          setUserId(sessionUser.id);
          setEmail(sessionUser.email);
          setName(sessionUser.name);
          await refreshAccount();
        }
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [refreshAccount]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      userId,
      email,
      name,
      role,
      account,
      refreshAccount,
      signIn: async (emailAddr, password) => {
        const result = await doSignIn(emailAddr, password);
        if (result.error) throw new Error(result.error.message ?? 'Sign-in failed.');
        setUserId(result.data?.user?.id ?? null);
        setEmail(result.data?.user?.email ?? null);
        await refreshAccount();
      },
      signUp: async (displayName, emailAddr, password) => {
        const result = await doSignUp(displayName, emailAddr, password);
        if (result.error) throw new Error(result.error.message ?? 'Registration failed.');
        setUserId(result.data?.user?.id ?? null);
        setEmail(result.data?.user?.email ?? null);
        await refreshAccount();
      },
      signOut: async () => {
        await doSignOut();
        setUserId(null); setEmail(null); setName(null); setRole(null); setAccount(null);
      },
    }),
    [loading, userId, email, name, role, account, refreshAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
