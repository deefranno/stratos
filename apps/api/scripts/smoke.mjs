/**
 * Integration smoke test for the Stratos API against a running server + database.
 * Verifies: auth, customer onboarding, entry CRUD, golden financial values,
 * duplicate prevention, negative-input rejection, zero-division safety,
 * fuel-edit propagation, truck plan limits, customer data isolation,
 * admin authorization, support tickets, and billing configuration state.
 *
 * Usage: node scripts/smoke.mjs [baseUrl]   (default http://localhost:3001)
 */
const BASE = process.argv[2] ?? 'http://localhost:3001';
let passed = 0, failed = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name} ${extra}`); }
};
const api = async (path, { method = 'GET', body, jar } = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', origin: 'http://localhost:5173', ...(jar ? { cookie: jar.header } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  if (jar && setCookies.length) jar.header = setCookies.map((c) => c.split(';')[0]).join('; ');
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
};
const makeJar = () => ({ header: '' });
const FIXTURE = {
  revenue: '18500.00', fuelSpend: '4100.00',
  truckPayment: '2800.00', insurance: '750.00', permits: '200.00', otherFixedCosts: '150.00',
  maintenance: '4550.00', tires: '300.00', tolls: '250.00', otherVariableCosts: '100.00',
  totalMiles: '9750.000', gallonsPurchased: '1430.000',
};

console.log('Stratos API smoke test →', BASE);
const health = await api('/api/health');
ok('health endpoint', health.status === 200 && health.json.database === 'up');

// --- Auth & onboarding ---
const stamp = Date.now();
const adminJar = makeJar(), aliceJar = makeJar(), bobJar = makeJar();
// Must match the server's ADMIN_EMAILS exactly; sign in if this address
// already exists from a previous smoke run against the same database.
let adminSignup = await api('/api/auth/sign-up/email', { method: 'POST', jar: adminJar, body: { name: 'Admin User', email: 'admin@stratos.test', password: 'Sup3rSecret!' } });
if (![200, 201].includes(adminSignup.status)) {
  adminSignup = await api('/api/auth/sign-in/email', { method: 'POST', jar: adminJar, body: { email: 'admin@stratos.test', password: 'Sup3rSecret!' } });
}
ok('sign-up/sign-in (admin email)', adminSignup.status === 200 || adminSignup.status === 201, `status=${adminSignup.status}`);
const aliceSignup = await api('/api/auth/sign-up/email', { method: 'POST', jar: aliceJar, body: { name: 'Alice Owner', email: `alice${stamp}@stratos.test`, password: 'Sup3rSecret!' } });
ok('sign-up (customer)', aliceSignup.status === 200 || aliceSignup.status === 201);

const account = await api('/api/account', { jar: aliceJar });
ok('account has client + Owner-Operator plan', account.status === 200 && account.json?.subscription?.plan?.code === 'OWNER_OPERATOR', JSON.stringify(account.json).slice(0, 200));

const trucks = await api('/api/trucks', { jar: aliceJar });
ok('starter truck "Truck #1" created', trucks.json?.length === 1 && trucks.json[0].name === 'Truck #1');
const truckId = trucks.json?.[0]?.id;

const secondTruck = await api('/api/trucks', { method: 'POST', jar: aliceJar, body: { name: 'Truck #2' } });
ok('plan limit blocks 2nd truck (Owner-Operator = 1)', secondTruck.status === 402 && secondTruck.json.code === 'PLAN_LIMIT_REACHED');

// --- Golden fixture entry ---
const entry = await api('/api/entries', { method: 'POST', jar: aliceJar, body: { truckId, reportingMonth: '2025-03', ...FIXTURE } });
ok('entry created', entry.status === 201, JSON.stringify(entry.json).slice(0, 300));
const m = entry.json?.metrics ?? {};
ok('golden: TOC = $13,200 (fuel once)', m.totalOperatingCosts === 13200);
ok('golden: profit = $5,300', m.estimatedMonthlyProfit === 5300);
ok('golden: margin = 28.65%', m.profitMarginPercent?.toFixed(2) === '28.65');
ok('golden: MPG ≈ 6.82', m.mpg?.toFixed(2) === '6.82');
ok('golden: fuel CPM ≈ $0.42', m.fuelCostPerMile?.toFixed(2) === '0.42');
ok('golden: total CPM ≈ $1.35', m.totalCostPerMile?.toFixed(2) === '1.35');
ok('golden: revenue CPM ≈ $1.90', m.revenuePerMile?.toFixed(2) === '1.90');
ok('golden: profit CPM ≈ $0.54', m.estimatedProfitPerMile?.toFixed(2) === '0.54');

// --- Validation & duplicates ---
const dup = await api('/api/entries', { method: 'POST', jar: aliceJar, body: { truckId, reportingMonth: '2025-03', ...FIXTURE } });
ok('duplicate truck+month rejected (409)', dup.status === 409);
const negative = await api('/api/entries', { method: 'POST', jar: aliceJar, body: { truckId, reportingMonth: '2025-02', ...FIXTURE, fuelSpend: '-100' } });
ok('negative fuel rejected (400)', negative.status === 400);
const zeroEntry = await api('/api/entries', { method: 'POST', jar: aliceJar, body: { truckId, reportingMonth: '2025-04', ...FIXTURE, totalMiles: '0', gallonsPurchased: '0', revenue: '0' } });
ok('zero miles/gallons/revenue accepted safely', zeroEntry.status === 201 && zeroEntry.json?.metrics?.mpg === 0 && zeroEntry.json?.metrics?.notes?.length === 3);

// --- Fuel edit propagates ---
const edited = await api(`/api/entries/${entry.json.id}`, { method: 'PUT', jar: aliceJar, body: { truckId, reportingMonth: '2025-03', ...FIXTURE, fuelSpend: '4200.00' } });
const em = edited.json?.metrics ?? {};
ok('fuel +$100 → TOC +$100', edited.status === 200 && em.totalOperatingCosts === 13300);
ok('fuel +$100 → profit −$100', em.estimatedMonthlyProfit === 5200);
ok('fuel edit does NOT change MPG', em.mpg?.toFixed(2) === '6.82');
await api(`/api/entries/${entry.json.id}`, { method: 'PUT', jar: aliceJar, body: { truckId, reportingMonth: '2025-03', ...FIXTURE } });

// --- Summary & isolation ---
const summary = await api('/api/entries/summary', { jar: aliceJar });
ok('summary returns kpis + history for selected month', summary.json?.kpis?.totalOperatingCosts === 13200 && summary.json?.history?.length === 2);

const bobSignup = await api('/api/auth/sign-up/email', { method: 'POST', jar: bobJar, body: { name: 'Bob Owner', email: `bob${stamp}@stratos.test`, password: 'Sup3rSecret!' } });
ok('second customer signed up', bobSignup.status === 200 || bobSignup.status === 201);
const bobTrucks = await api('/api/trucks', { jar: bobJar });
const bobEntry = await api('/api/entries', { method: 'POST', jar: bobJar, body: { truckId: bobTrucks.json[0].id, reportingMonth: '2025-01', ...FIXTURE } });
ok('bob created his own entry', bobEntry.status === 201);
const bobEntries = await api('/api/entries', { jar: bobJar });
ok('bob sees ONLY his entry', bobEntries.json?.length === 1 && bobEntries.json[0].reportingMonth === '2025-01');
const aliceEntries = await api('/api/entries', { jar: aliceJar });
ok('alice still sees only hers (2 entries)', aliceEntries.json?.length === 2);
const crossEdit = await api(`/api/entries/${bobEntry.json.id}`, { method: 'PUT', jar: aliceJar, body: { truckId, reportingMonth: '2025-01', ...FIXTURE } });
ok("alice cannot edit bob's entry (404)", crossEdit.status === 404);

// --- Admin ---
const adminAccount = await api('/api/account', { jar: adminJar });
ok('ADMIN_EMAILS account got ADMIN role', adminAccount.json?.user?.role === 'ADMIN');
const adminMetrics = await api('/api/admin/metrics', { jar: adminJar });
ok('admin metrics endpoint', adminMetrics.status === 200 && adminMetrics.json?.customers >= 3);
const forbidden = await api('/api/admin/metrics', { jar: aliceJar });
ok('customer blocked from admin (403)', forbidden.status === 403);

// --- Support & billing ---
const ticket = await api('/api/support', { method: 'POST', jar: aliceJar, body: { subject: 'MPG question', message: 'How is MPG calculated for partial gallons?' } });
ok('support ticket created', ticket.status === 201);
const adminTickets = await api('/api/admin/tickets', { jar: adminJar });
ok('admin sees support tickets', adminTickets.status === 200 && adminTickets.json?.length >= 1);
const ticketPatch = await api(`/api/admin/tickets/${ticket.json.id}`, { method: 'PATCH', jar: adminJar, body: { status: 'in_progress' } });
ok('admin updates ticket status', ticketPatch.json?.status === 'in_progress');
const billing = await api('/api/billing', { jar: aliceJar });
ok('billing reports payments not configured (no Stripe keys)', billing.status === 200 && billing.json?.paymentsConfigured === false);
const audit = await api('/api/admin/audit', { jar: adminJar });
ok('audit log records entry.create', audit.json?.some((l) => l.action === 'entry.create'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
