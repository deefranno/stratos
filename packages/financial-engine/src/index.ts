/**
 * Stratos Trucking Profit Navigator — Centralized Financial Calculation Engine.
 *
 * This is the ONLY place financial formulas live in the application. The same
 * functions power: dashboard KPI cards, monthly entry previews, profit analysis,
 * fuel efficiency reporting, financial trend charts, the Monthly Profit Checkup,
 * downloadable PDF reports, historical comparisons, and administrative reporting.
 *
 * Standards:
 * - Monetary values are parsed and summed as integer cents (BigInt). No floats
 *   are ever added together for money. Ratios are computed from exact cent
 *   totals and rounded only for display.
 * - Fuel Spend is a top-level input and is included EXACTLY ONCE in
 *   Total Operating Costs (it belongs to neither Fixed nor Variable Costs).
 * - Negative inputs are rejected. Division by zero returns 0 with an
 *   explanatory note. Missing inputs are distinguished from actual zeros.
 */

export const APP_NAME = 'Stratos Trucking Profit Navigator';

export const FIXED_COST_FIELDS = ['truckPayment', 'insurance', 'permits', 'otherFixedCosts'] as const;
export const VARIABLE_COST_FIELDS = ['maintenance', 'tires', 'tolls', 'otherVariableCosts'] as const;
export const UNIT_FIELDS = ['totalMiles', 'gallonsPurchased'] as const;

export const MONEY_FIELDS = [
  'revenue',
  'fuelSpend',
  ...FIXED_COST_FIELDS,
  ...VARIABLE_COST_FIELDS,
] as const;

export type MoneyField = (typeof MONEY_FIELDS)[number];
export type UnitField = (typeof UNIT_FIELDS)[number];
export type FieldName = MoneyField | UnitField;

/** Raw financial input. Every field may be a string, number, or null/undefined
 *  (null/undefined/'' means "missing", which is tracked separately from 0). */
export interface FinancialInput {
  revenue?: string | number | null;
  fuelSpend?: string | number | null;
  truckPayment?: string | number | null;
  insurance?: string | number | null;
  permits?: string | number | null;
  otherFixedCosts?: string | number | null;
  maintenance?: string | number | null;
  tires?: string | number | null;
  tolls?: string | number | null;
  otherVariableCosts?: string | number | null;
  totalMiles?: string | number | null;
  gallonsPurchased?: string | number | null;
}

export interface FinancialMetrics {
  /** Money, in exact integer cents (BigInt). */
  revenueCents: bigint;
  fuelSpendCents: bigint;
  fixedCostsCents: bigint;
  variableCostsCents: bigint;
  totalOperatingCostsCents: bigint;
  estimatedMonthlyProfitCents: bigint;

  /** Money as USD numbers (whole cents → dollars, no precision loss). */
  revenue: number;
  fuelSpend: number;
  fixedCosts: number;
  variableCosts: number;
  totalOperatingCosts: number;
  estimatedMonthlyProfit: number;

  /** Units (miles / gallons) as exact thousandths (BigInt, 3 decimals). */
  totalMilesUnits: bigint;
  gallonsPurchasedUnits: bigint;
  totalMiles: number;
  gallonsPurchased: number;

  /** Ratios, full precision (round only for display). */
  profitMarginPercent: number;
  mpg: number;
  fuelCostPerMile: number;
  totalCostPerMile: number;
  revenuePerMile: number;
  estimatedProfitPerMile: number;

  /** Fields the caller did not supply (missing ≠ zero). */
  missing: FieldName[];
  /** Human-readable explanations for unavailable ratios. */
  notes: string[];
}

export class FinancialInputError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = 'FinancialInputError';
    this.field = field;
  }
}

const MAX_CENTS = 1_000_000_000_000_00n; // $10,000,000,000.00 prototype ceiling
const MAX_UNITS = 100_000_000_000_000n; // 100,000,000,000.000 units

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === '';
}

const AMOUNT_RE = /^\d+(?:\.\d{1,2})?$/;
const UNIT_RE = /^\d+(?:\.\d{1,3})?$/;

/** Parses a nonnegative decimal string into integer cents (2 decimal places). */
export function parseAmountToCents(value: string | number, field: string): bigint {
  const text = String(value).trim();
  if (!AMOUNT_RE.test(text)) {
    throw new FinancialInputError(
      field,
      `${field} must be a nonnegative amount with at most 2 decimal places.`
    );
  }
  const [whole, fraction = ''] = text.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > MAX_CENTS) {
    throw new FinancialInputError(field, `${field} exceeds the supported limit.`);
  }
  return cents;
}

/** Parses a nonnegative decimal string into thousandths (3 decimal places). */
export function parseUnits(value: string | number, field: string): bigint {
  const text = String(value).trim();
  if (!UNIT_RE.test(text)) {
    throw new FinancialInputError(
      field,
      `${field} must be a nonnegative value with at most 3 decimal places.`
    );
  }
  const [whole, fraction = ''] = text.split('.');
  const units = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
  if (units > MAX_UNITS) {
    throw new FinancialInputError(field, `${field} exceeds the supported limit.`);
  }
  return units;
}

const centsToNumber = (cents: bigint): number => Number(cents) / 100;
const unitsToNumber = (units: bigint): number => Number(units) / 1000;

/**
 * The authoritative calculation for the entire application.
 *
 *   Fixed Costs           = Truck Payment + Insurance + Permits + Other Fixed Costs
 *   Variable Costs        = Maintenance + Tires + Tolls + Other Variable Costs
 *   Total Operating Costs = Fuel Spend + Fixed Costs + Variable Costs   (fuel exactly once)
 *   Estimated Monthly Profit = Revenue − Total Operating Costs
 *   Profit Margin (%)     = Profit / Revenue × 100            (0 when revenue is 0)
 *   MPG                   = Total Miles / Gallons Purchased   (0 when gallons are 0)
 *   Fuel Cost Per Mile    = Fuel Spend / Total Miles          (0 when miles are 0)
 *   Total Cost Per Mile   = Total Operating Costs / Total Miles (includes fuel)
 *   Revenue Per Mile      = Revenue / Total Miles
 *   Est. Profit Per Mile  = Estimated Monthly Profit / Total Miles
 */
export function calculateFinancials(input: FinancialInput): FinancialMetrics {
  const missing: FieldName[] = [];
  const cents: Partial<Record<MoneyField, bigint>> = {};
  const units: Partial<Record<UnitField, bigint>> = {};

  for (const field of MONEY_FIELDS) {
    const value = input[field];
    if (isMissing(value)) {
      missing.push(field);
      cents[field] = 0n;
    } else {
      cents[field] = parseAmountToCents(value as string | number, field);
    }
  }
  for (const field of UNIT_FIELDS) {
    const value = input[field];
    if (isMissing(value)) {
      missing.push(field);
      units[field] = 0n;
    } else {
      units[field] = parseUnits(value as string | number, field);
    }
  }

  const c = cents as Record<MoneyField, bigint>;
  const u = units as Record<UnitField, bigint>;

  const fixedCostsCents = FIXED_COST_FIELDS.reduce((sum, key) => sum + c[key], 0n);
  const variableCostsCents = VARIABLE_COST_FIELDS.reduce((sum, key) => sum + c[key], 0n);
  // Fuel is added here and only here: exactly once, outside fixed/variable.
  const totalOperatingCostsCents = c.fuelSpend + fixedCostsCents + variableCostsCents;
  const estimatedMonthlyProfitCents = c.revenue - totalOperatingCostsCents;

  const miles = unitsToNumber(u.totalMiles);
  const gallons = unitsToNumber(u.gallonsPurchased);
  const revenue = centsToNumber(c.revenue);
  const fuelSpend = centsToNumber(c.fuelSpend);
  const fixedCosts = centsToNumber(fixedCostsCents);
  const variableCosts = centsToNumber(variableCostsCents);
  const totalOperatingCosts = centsToNumber(totalOperatingCostsCents);
  const estimatedMonthlyProfit = centsToNumber(estimatedMonthlyProfitCents);

  const notes: string[] = [];
  if (!miles) {
    notes.push(
      `No mileage data for per-mile metrics: ${
        missing.includes('totalMiles') ? 'miles are missing.' : 'miles are zero. Ratios display 0.'
      }`
    );
  }
  if (!gallons) {
    notes.push(
      `No fuel-efficiency data: ${
        missing.includes('gallonsPurchased')
          ? 'gallons are missing.'
          : 'gallons are zero. MPG displays 0.'
      }`
    );
  }
  if (!revenue) {
    notes.push(
      'Profit margin is unavailable when revenue is missing or zero; the ratio displays 0.'
    );
  }

  return {
    revenueCents: c.revenue,
    fuelSpendCents: c.fuelSpend,
    fixedCostsCents,
    variableCostsCents,
    totalOperatingCostsCents,
    estimatedMonthlyProfitCents,
    revenue,
    fuelSpend,
    fixedCosts,
    variableCosts,
    totalOperatingCosts,
    estimatedMonthlyProfit,
    totalMilesUnits: u.totalMiles,
    gallonsPurchasedUnits: u.gallonsPurchased,
    totalMiles: miles,
    gallonsPurchased: gallons,
    profitMarginPercent: c.revenue ? (Number(estimatedMonthlyProfitCents) / Number(c.revenue)) * 100 : 0,
    mpg: gallons ? miles / gallons : 0,
    fuelCostPerMile: miles ? fuelSpend / miles : 0,
    totalCostPerMile: miles ? totalOperatingCosts / miles : 0,
    revenuePerMile: miles ? revenue / miles : 0,
    estimatedProfitPerMile: miles ? estimatedMonthlyProfit / miles : 0,
    missing,
    notes,
  };
}

/* ------------------------------------------------------------------ */
/* Display formatting — rounding happens HERE only.                    */
/* ------------------------------------------------------------------ */

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** Formats a USD value (dollars as number) to two decimal places. */
export const formatMoney = (value: number): string => usd.format(value || 0);

/** Formats exact integer cents as USD. */
export const formatCents = (cents: bigint): string => usd.format(centsToNumber(cents));

/** Formats miles/gallons-style numbers. */
export const formatNumber = (value: number): string => plain.format(value || 0);

/** Formats a percentage to 2 decimal places (e.g. "28.65%"). */
export const formatPercent = (value: number): string => `${(value || 0).toFixed(2)}%`;

/** Formats MPG to 2 decimal places (e.g. "6.82 MPG"). */
export const formatMpg = (value: number): string => `${(value || 0).toFixed(2)} MPG`;

/** Converts exact cents to a JSON-safe dollar string ("13200.00"). */
export const centsToDecimalString = (cents: bigint): string =>
  (centsToNumber(cents)).toFixed(2);
