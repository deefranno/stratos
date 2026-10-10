import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireClient } from '../middleware/auth';
import { monthlyEntryInputSchema } from '../lib/validate';
import { audit } from '../lib/audit';
import { entryToEngineInput, serializeEntry, metricsToJSON } from '../lib/serialize';
import { calculateFinancials } from '@stratos/financial-engine';

export const entriesRouter = Router();
entriesRouter.use(requireClient);

/** Verifies the truck exists for THIS customer (data isolation). */
async function ownedTruck(clientId: string, truckId: string) {
  return prisma.truck.findFirst({ where: { id: truckId, clientId } });
}

/** All entries across the customer's trucks, chronological, with computed metrics. */
entriesRouter.get('/', async (req, res) => {
  const entries = await prisma.monthlyEntry.findMany({
    where: { truck: { clientId: req.client!.id } },
    orderBy: { reportingMonth: 'asc' },
    include: { truck: true },
  });
  res.json(entries.map(serializeEntry));
});

/** Dashboard summary: computed from raw entries via the engine — no stored totals. */
entriesRouter.get('/summary', async (req, res) => {
  const month = typeof req.query.month === 'string' ? req.query.month : null;
  const entries = await prisma.monthlyEntry.findMany({
    where: {
      truck: { clientId: req.client!.id },
      ...(month ? { reportingMonth: month } : {}),
    },
    orderBy: { reportingMonth: 'asc' },
    include: { truck: true },
  });
  const selected = month ? entries.find((e) => e.reportingMonth === month) : entries.at(-1);
  const kpis = selected ? metricsToJSON(calculateFinancials(entryToEngineInput(selected))) : null;
  res.json({
    months: entries.map((e) => e.reportingMonth),
    selectedMonth: selected?.reportingMonth ?? null,
    kpis,
    history: entries.map((e) => {
      const m = calculateFinancials(entryToEngineInput(e));
      return {
        reportingMonth: e.reportingMonth,
        revenue: m.revenue,
        totalOperatingCosts: m.totalOperatingCosts,
        estimatedMonthlyProfit: m.estimatedMonthlyProfit,
        profitMarginPercent: m.profitMarginPercent,
        fuelSpend: m.fuelSpend,
        fixedCosts: m.fixedCosts,
        variableCosts: m.variableCosts,
        mpg: m.mpg,
        fuelCostPerMile: m.fuelCostPerMile,
        totalCostPerMile: m.totalCostPerMile,
        revenuePerMile: m.revenuePerMile,
        estimatedProfitPerMile: m.estimatedProfitPerMile,
        totalMiles: m.totalMiles,
        gallonsPurchased: m.gallonsPurchased,
      };
    }),
  });
});

/** Create a monthly entry. Duplicate truck+month is rejected (DB-enforced). */
entriesRouter.post('/', async (req, res) => {
  const parsed = monthlyEntryInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid entry data.', details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const truck = await ownedTruck(req.client!.id, data.truckId);
  if (!truck) {
    res.status(404).json({ error: 'Truck not found.' });
    return;
  }
  const duplicate = await prisma.monthlyEntry.findUnique({
    where: { truckId_reportingMonth: { truckId: truck.id, reportingMonth: data.reportingMonth } },
  });
  if (duplicate) {
    res.status(409).json({ error: 'An entry already exists for this truck and month. Edit the existing record instead.' });
    return;
  }
  try {
    const entry = await prisma.monthlyEntry.create({
      data: {
        truckId: truck.id,
        reportingMonth: data.reportingMonth,
        revenue: data.revenue, fuelSpend: data.fuelSpend,
        gallonsPurchased: data.gallonsPurchased, totalMiles: data.totalMiles,
        truckPayment: data.truckPayment, insurance: data.insurance,
        permits: data.permits, otherFixedCosts: data.otherFixedCosts,
        maintenance: data.maintenance, tires: data.tires,
        tolls: data.tolls, otherVariableCosts: data.otherVariableCosts,
      },
      include: { truck: true },
    });
    await audit(req, 'entry.create', {
      entity: 'monthlyEntry', entityId: entry.id,
      metadata: { reportingMonth: entry.reportingMonth, fuelSpend: String(entry.fuelSpend) },
    });
    res.status(201).json(serializeEntry(entry));
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      res.status(409).json({ error: 'An entry already exists for this truck and month.' });
      return;
    }
    throw error;
  }
});

/** Update an entry the customer owns. */
entriesRouter.put('/:id', async (req, res) => {
  const parsed = monthlyEntryInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid entry data.', details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const existing = await prisma.monthlyEntry.findFirst({
    where: { id: req.params.id, truck: { clientId: req.client!.id } },
  });
  if (!existing) {
    res.status(404).json({ error: 'Entry not found.' });
    return;
  }
  const truck = await ownedTruck(req.client!.id, data.truckId);
  if (!truck) {
    res.status(404).json({ error: 'Truck not found.' });
    return;
  }
  if (
    (existing.truckId !== truck.id || existing.reportingMonth !== data.reportingMonth) &&
    (await prisma.monthlyEntry.findUnique({
      where: { truckId_reportingMonth: { truckId: truck.id, reportingMonth: data.reportingMonth } },
    }))
  ) {
    res.status(409).json({ error: 'An entry already exists for this truck and month.' });
    return;
  }
  const entry = await prisma.monthlyEntry.update({
    where: { id: existing.id },
    data: {
      truckId: truck.id,
      reportingMonth: data.reportingMonth,
      revenue: data.revenue, fuelSpend: data.fuelSpend,
      gallonsPurchased: data.gallonsPurchased, totalMiles: data.totalMiles,
      truckPayment: data.truckPayment, insurance: data.insurance,
      permits: data.permits, otherFixedCosts: data.otherFixedCosts,
      maintenance: data.maintenance, tires: data.tires,
      tolls: data.tolls, otherVariableCosts: data.otherVariableCosts,
    },
    include: { truck: true },
  });
  await audit(req, 'entry.update', {
    entity: 'monthlyEntry', entityId: entry.id,
    metadata: { reportingMonth: entry.reportingMonth, fuelSpend: String(entry.fuelSpend) },
  });
  res.json(serializeEntry(entry));
});

entriesRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.monthlyEntry.findFirst({
    where: { id: req.params.id, truck: { clientId: req.client!.id } },
  });
  if (!existing) {
    res.status(404).json({ error: 'Entry not found.' });
    return;
  }
  await prisma.monthlyEntry.delete({ where: { id: existing.id } });
  await audit(req, 'entry.delete', { entity: 'monthlyEntry', entityId: existing.id });
  res.status(204).end();
});
