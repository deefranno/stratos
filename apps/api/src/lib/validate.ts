import { z } from 'zod';

/** Reporting month: "YYYY-MM" within a sane range. */
export const reportingMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Reporting month must be formatted YYYY-MM.');

/** Nonnegative decimal string with at most 2 decimal places (money). */
export const amountSchema = z
  .string()
  .regex(/^\d+(?:\.\d{1,2})?$/, 'Must be a nonnegative amount with at most 2 decimal places.');

/** Nonnegative decimal string with at most 3 decimal places (miles/gallons). */
export const unitSchema = z
  .string()
  .regex(/^\d+(?:\.\d{1,3})?$/, 'Must be a nonnegative value with at most 3 decimal places.');

/** Accepts string or number from JSON bodies; normalizes to validated string. */
const numeric = (schema: z.ZodType<string>) =>
  z.preprocess((v) => (v === undefined || v === null ? v : String(v)), schema);

export const monthlyEntryInputSchema = z.object({
  truckId: z.string().min(1, 'Truck is required.'),
  reportingMonth: reportingMonthSchema,
  revenue: numeric(amountSchema),
  fuelSpend: numeric(amountSchema),
  gallonsPurchased: numeric(unitSchema),
  totalMiles: numeric(unitSchema),
  truckPayment: numeric(amountSchema),
  insurance: numeric(amountSchema),
  permits: numeric(amountSchema),
  otherFixedCosts: numeric(amountSchema),
  maintenance: numeric(amountSchema),
  tires: numeric(amountSchema),
  tolls: numeric(amountSchema),
  otherVariableCosts: numeric(amountSchema),
});

export type MonthlyEntryInput = z.infer<typeof monthlyEntryInputSchema>;

export const truckInputSchema = z.object({
  name: z.string().trim().min(1, 'Truck name is required.').max(60),
});

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(140),
  message: z.string().trim().min(10).max(5000),
});

export const accountUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  businessName: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
});
