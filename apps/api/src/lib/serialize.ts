import type { MonthlyEntry, Truck } from '@prisma/client';
import { calculateFinancials, type FinancialInput, type FinancialMetrics } from '@stratos/financial-engine';

/** Prisma Decimal → engine input string ("4100" / "1430.000"). */
export function entryToEngineInput(e: {
  revenue: unknown; fuelSpend: unknown; truckPayment: unknown; insurance: unknown;
  permits: unknown; otherFixedCosts: unknown; maintenance: unknown; tires: unknown;
  tolls: unknown; otherVariableCosts: unknown; totalMiles: unknown; gallonsPurchased: unknown;
}): FinancialInput {
  const s = (v: unknown) => String(v);
  return {
    revenue: s(e.revenue), fuelSpend: s(e.fuelSpend),
    truckPayment: s(e.truckPayment), insurance: s(e.insurance), permits: s(e.permits),
    otherFixedCosts: s(e.otherFixedCosts), maintenance: s(e.maintenance), tires: s(e.tires),
    tolls: s(e.tolls), otherVariableCosts: s(e.otherVariableCosts),
    totalMiles: s(e.totalMiles), gallonsPurchased: s(e.gallonsPurchased),
  };
}

/** JSON-safe entry shape with engine-computed metrics. Calculated totals are
 *  never persisted, only derived — so they can never become inconsistent. */
export function serializeEntry(entry: MonthlyEntry & { truck?: Truck }) {
  const metrics = calculateFinancials(entryToEngineInput(entry));
  const money = (v: unknown) => Number(v);
  return {
    id: entry.id,
    truckId: entry.truckId,
    truckName: entry.truck?.name,
    reportingMonth: entry.reportingMonth,
    inputs: {
      revenue: money(entry.revenue),
      fuelSpend: money(entry.fuelSpend),
      gallonsPurchased: Number(entry.gallonsPurchased),
      totalMiles: Number(entry.totalMiles),
      truckPayment: money(entry.truckPayment),
      insurance: money(entry.insurance),
      permits: money(entry.permits),
      otherFixedCosts: money(entry.otherFixedCosts),
      maintenance: money(entry.maintenance),
      tires: money(entry.tires),
      tolls: money(entry.tolls),
      otherVariableCosts: money(entry.otherVariableCosts),
    },
    metrics: metricsToJSON(metrics),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function metricsToJSON(m: FinancialMetrics) {
  return {
    revenue: m.revenue,
    fuelSpend: m.fuelSpend,
    fixedCosts: m.fixedCosts,
    variableCosts: m.variableCosts,
    totalOperatingCosts: m.totalOperatingCosts,
    estimatedMonthlyProfit: m.estimatedMonthlyProfit,
    profitMarginPercent: m.profitMarginPercent,
    totalMiles: m.totalMiles,
    gallonsPurchased: m.gallonsPurchased,
    mpg: m.mpg,
    fuelCostPerMile: m.fuelCostPerMile,
    totalCostPerMile: m.totalCostPerMile,
    revenuePerMile: m.revenuePerMile,
    estimatedProfitPerMile: m.estimatedProfitPerMile,
    missing: m.missing,
    notes: m.notes,
  };
}
