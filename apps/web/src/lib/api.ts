/** Thin typed fetch wrapper for the Stratos API (cookie-based sessions). */
// Default: same-origin. In development the Vite dev server proxies /api to
// the API process; in production the Worker/ingress routes /api to the API.
// Set VITE_API_URL only when the API lives on a separate reachable origin.
export const API_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, json?.error ?? `Request failed (${res.status})`, json?.code);
  }
  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/* ----------------------- API response types ----------------------- */

export interface Kpis {
  revenue: number; fuelSpend: number; fixedCosts: number; variableCosts: number;
  totalOperatingCosts: number; estimatedMonthlyProfit: number; profitMarginPercent: number;
  totalMiles: number; gallonsPurchased: number; mpg: number; fuelCostPerMile: number;
  totalCostPerMile: number; revenuePerMile: number; estimatedProfitPerMile: number;
  missing: string[]; notes: string[];
}

export interface EntryInput {
  revenue: number; fuelSpend: number; gallonsPurchased: number; totalMiles: number;
  truckPayment: number; insurance: number; permits: number; otherFixedCosts: number;
  maintenance: number; tires: number; tolls: number; otherVariableCosts: number;
}

export interface Entry {
  id: string; truckId: string; truckName?: string; reportingMonth: string;
  inputs: EntryInput; metrics: Kpis; createdAt: string; updatedAt: string;
}

export interface HistoryPoint extends Kpis {
  reportingMonth: string;
}

export interface Summary {
  months: string[];
  selectedMonth: string | null;
  kpis: Kpis | null;
  history: HistoryPoint[];
}

export interface Truck { id: string; name: string; entryCount: number; }

export interface AccountInfo {
  user: { id: string; email: string; name: string; role: 'CUSTOMER' | 'ADMIN' };
  client: { displayName: string; businessName: string | null; phone: string | null; createdAt: string };
  subscription: {
    status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean;
    plan: { code: string; name: string; priceCents: number; maxTrucks: number };
  } | null;
}

export interface BillingInfo {
  paymentsConfigured: boolean;
  subscription: AccountInfo['subscription'];
  plans: { code: string; name: string; description: string | null; priceCents: number; maxTrucks: number; active: boolean }[];
}

export interface Ticket { id: string; subject: string; message: string; status: string; createdAt: string; }

export interface AdminCustomer {
  id: string; displayName: string; businessName: string | null; email: string; role: string;
  createdAt: string; truckCount: number; ticketCount: number;
  subscription: { status: string; planName: string; priceCents: number; currentPeriodEnd: string | null } | null;
}

export interface AdminMetrics {
  customers: number; activeSubscriptions: number; monthlyRecurringRevenueCents: number;
  totalEntries: number; ticketsByStatus: Record<string, number>;
}

export interface AdminTicket extends Ticket { customer: string; email: string; }

export interface AuditEntry {
  id: string; action: string; entity: string | null; entityId: string | null;
  email: string | null; ipAddress: string | null; createdAt: string;
}
