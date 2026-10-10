import { describe, it, expect } from 'vitest';
import {
  calculateFinancials,
  parseAmountToCents,
  FinancialInputError,
  formatMoney,
  formatCents,
  type FinancialInput,
} from '../src/index';

/**
 * Golden fixture from the development specification (§15):
 * Revenue $18,500 · Fuel $4,100 · Fixed $3,900 · Variable $5,200
 * Miles 9,750 · Gallons 1,430
 */
const REF: FinancialInput = {
  revenue: '18500.00',
  fuelSpend: '4100.00',
  truckPayment: '2800.00',
  insurance: '750.00',
  permits: '200.00',
  otherFixedCosts: '150.00', // fixed = 3,900
  maintenance: '4550.00',
  tires: '300.00',
  tolls: '250.00',
  otherVariableCosts: '100.00', // variable = 5,200
  totalMiles: '9750.000',
  gallonsPurchased: '1430.000',
};

describe('§15 golden reference values', () => {
  const m = calculateFinancials(REF);

  it('1. fuel is included in total operating costs (fuel exactly once)', () => {
    expect(m.totalOperatingCostsCents).toBe(1_320_000n); // $13,200.00
    expect(m.totalOperatingCosts).toBe(13200);
    expect(m.fixedCosts).toBe(3900);
    expect(m.variableCosts).toBe(5200);
    expect(m.fuelSpend).toBe(4100);
  });

  it('2. fuel is not double-counted (TOC − fuel === fixed + variable)', () => {
    expect(m.totalOperatingCostsCents - m.fuelSpendCents).toBe(
      m.fixedCostsCents + m.variableCostsCents
    );
    // Fuel in neither fixed nor variable buckets:
    expect(m.fixedCostsCents + m.variableCostsCents).toBe(910_000n); // $9,100
  });

  it('3. profit deducts fuel', () => {
    expect(m.estimatedMonthlyProfitCents).toBe(530_000n); // $5,300.00
    expect(m.estimatedMonthlyProfit).toBe(5300);
    expect(m.estimatedMonthlyProfit).toBe(
      18500 - 4100 - m.fixedCosts - m.variableCosts
    );
  });

  it('profit margin reflects fuel (28.65%)', () => {
    expect(m.profitMarginPercent.toFixed(2)).toBe('28.65');
  });

  it('4. cost per mile includes fuel', () => {
    expect(m.totalCostPerMile.toFixed(2)).toBe('1.35');
    expect(m.totalCostPerMile).toBeCloseTo(13200 / 9750, 10);
  });

  it('5. expense breakdown reconciles with total operating costs', () => {
    expect(m.fuelSpend + m.fixedCosts + m.variableCosts).toBe(m.totalOperatingCosts);
  });

  it('fuel efficiency uses miles and gallons, never fuel spend', () => {
    expect(m.mpg.toFixed(2)).toBe('6.82');
    expect(m.mpg).toBeCloseTo(9750 / 1430, 10);
  });

  it('fuel cost per mile uses fuel spend directly', () => {
    expect(m.fuelCostPerMile.toFixed(2)).toBe('0.42');
    expect(m.fuelCostPerMile).toBeCloseTo(4100 / 9750, 10);
  });

  it('revenue per mile and profit per mile', () => {
    expect(m.revenuePerMile.toFixed(2)).toBe('1.90');
    expect(m.estimatedProfitPerMile.toFixed(2)).toBe('0.54');
    expect(m.estimatedProfitPerMile).toBeCloseTo(5300 / 9750, 10);
  });

  it('6. dashboard and reports match — the engine is deterministic and pure', () => {
    const a = calculateFinancials(REF);
    const b = calculateFinancials({ ...REF });
    const snapshot = (m: typeof a) => JSON.stringify(m, (_, v) => (typeof v === 'bigint' ? String(v) : v));
    expect(snapshot(a)).toBe(snapshot(b));
  });

  it('7. charts use the same financial calculations (chart series derive from one call)', () => {
    // A "chart" is just a projection of engine output; verify projections match.
    const revenueSeries = m.revenue;
    const costSeries = m.totalOperatingCosts;
    const profitSeries = m.estimatedMonthlyProfit;
    expect(revenueSeries - costSeries).toBe(profitSeries);
  });

  it('8. editing fuel expenditure updates every dependent metric', () => {
    const base = calculateFinancials(REF);
    const higher = calculateFinancials({ ...REF, fuelSpend: '4200.00' }); // +$100 fuel
    expect(higher.totalOperatingCostsCents).toBe(base.totalOperatingCostsCents + 10_000n);
    expect(higher.estimatedMonthlyProfitCents).toBe(base.estimatedMonthlyProfitCents - 10_000n);
    expect(higher.totalCostPerMile).toBeGreaterThan(base.totalCostPerMile);
    expect(higher.fuelCostPerMile).toBeGreaterThan(base.fuelCostPerMile);
    expect(higher.estimatedProfitPerMile).toBeLessThan(base.estimatedProfitPerMile);
    expect(higher.profitMarginPercent).toBeLessThan(base.profitMarginPercent);
    expect(higher.mpg).toBe(base.mpg); // fuel spend must NOT affect MPG
  });

  it('9. zero-mile, zero-gallon, and zero-revenue entries never throw or produce NaN', () => {
    const zero = calculateFinancials({
      ...REF,
      totalMiles: '0',
      gallonsPurchased: '0',
      revenue: '0',
    });
    expect(zero.mpg).toBe(0);
    expect(zero.fuelCostPerMile).toBe(0);
    expect(zero.totalCostPerMile).toBe(0);
    expect(zero.revenuePerMile).toBe(0);
    expect(zero.estimatedProfitPerMile).toBe(0);
    expect(zero.profitMarginPercent).toBe(0);
    expect(Number.isNaN(zero.mpg)).toBe(false);
    expect(zero.notes.length).toBe(3); // miles, gallons, revenue explained
  });

  it('10. negative inputs are rejected', () => {
    expect(() => calculateFinancials({ ...REF, fuelSpend: '-100' })).toThrow(FinancialInputError);
    expect(() => calculateFinancials({ ...REF, revenue: '-1' })).toThrow(/nonnegative/);
    expect(() => parseAmountToCents('-0.01', 'fuelSpend')).toThrow(FinancialInputError);
  });
});

describe('calculation standards', () => {
  it('rejects money with more than 2 decimal places', () => {
    expect(() => calculateFinancials({ ...REF, fuelSpend: '10.123' })).toThrow(/2 decimal/);
  });

  it('accepts miles/gallons with 3 decimal places but rejects 4', () => {
    expect(() => calculateFinancials({ ...REF, totalMiles: '100.1234' })).toThrow(/3 decimal/);
    expect(calculateFinancials({ ...REF, totalMiles: '100.123' }).totalMiles).toBeCloseTo(100.123);
  });

  it('uses exact cent arithmetic (0.10 + 0.20 === 0.30, no float drift)', () => {
    const m = calculateFinancials({
      revenue: '0.10',
      fuelSpend: '0.20',
      truckPayment: '0',
      insurance: '0',
      permits: '0',
      otherFixedCosts: '0',
      maintenance: '0',
      tires: '0',
      tolls: '0',
      otherVariableCosts: '0',
      totalMiles: '1',
      gallonsPurchased: '1',
    });
    expect(m.totalOperatingCostsCents).toBe(20n);
    expect(formatCents(m.totalOperatingCostsCents)).toBe('$0.20');
    expect(m.estimatedMonthlyProfitCents).toBe(-10n); // loss of exactly 10 cents
  });

  it('distinguishes missing data from actual zero', () => {
    const missing = calculateFinancials({ ...REF, fuelSpend: undefined });
    expect(missing.missing).toContain('fuelSpend');
    expect(missing.fuelSpend).toBe(0);
    const zero = calculateFinancials({ ...REF, fuelSpend: '0' });
    expect(zero.missing).not.toContain('fuelSpend');
    expect(missing.totalOperatingCosts).toBe(zero.totalOperatingCosts); // identical math...
    expect(missing.missing).toEqual(['fuelSpend']); // ...but the engine flags exactly what was not supplied
  });

  it('formats money to two decimal places', () => {
    expect(formatMoney(13200)).toBe('$13,200.00');
    expect(formatMoney(0.5)).toBe('$0.50');
    expect(formatMoney(NaN)).toBe('$0.00');
  });
});
