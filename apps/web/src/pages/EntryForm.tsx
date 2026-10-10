import { useEffect, useMemo, useState } from 'react';
import { useForm, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { PageHeader, Card, Notice } from '../components/ui';
import { api, type Entry, type Truck } from '../lib/api';
import { calculateFinancials, formatMoney, formatPercent, type FinancialInput } from '@stratos/financial-engine';

const amount = z.string().regex(/^\d+(?:\.\d{1,2})?$/, 'Nonnegative, max 2 decimal places');
const unit = z.string().regex(/^\d+(?:\.\d{1,3})?$/, 'Nonnegative, max 3 decimal places');

const schema = z.object({
  reportingMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Choose a valid month'),
  truckId: z.string().min(1, 'Choose a truck'),
  totalMiles: unit,
  fuelSpend: amount,
  gallonsPurchased: unit,
  revenue: amount,
  truckPayment: amount,
  insurance: amount,
  permits: amount,
  otherFixedCosts: amount,
  maintenance: amount,
  tires: amount,
  tolls: amount,
  otherVariableCosts: amount,
});

type FormValues = z.infer<typeof schema>;

/** The most recently completed month (default reporting period). */
function lastCompletedMonth(): string {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
}

const NUMERIC_FIELDS = [
  'totalMiles', 'gallonsPurchased', 'revenue', 'fuelSpend',
  'truckPayment', 'insurance', 'permits', 'otherFixedCosts',
  'maintenance', 'tires', 'tolls', 'otherVariableCosts',
] as const;

function Field({ name, label, hint, register, error }: {
  name: typeof NUMERIC_FIELDS[number];
  label: string;
  hint: string;
  register: UseFormRegister<FormValues>;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={`f_${name}`} className="mb-1.5 block text-xs font-bold">{label}</label>
      <input
        id={`f_${name}`}
        type="number" min="0" step={name === 'totalMiles' || name === 'gallonsPurchased' ? '0.001' : '0.01'}
        inputMode="decimal"
        aria-invalid={error ? true : undefined}
        className={`min-h-[46px] w-full rounded-md border bg-white px-3 ${error ? 'border-danger' : 'border-input-line'}`}
        {...register(name)}
      />
      <small className="mt-1 block text-muted">{error ?? hint}</small>
    </div>
  );
}

export default function EntryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [existing, setExisting] = useState<Entry | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register, handleSubmit, watch, reset, formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      reportingMonth: lastCompletedMonth(),
      truckId: '', totalMiles: '', gallonsPurchased: '', revenue: '', fuelSpend: '',
      truckPayment: '', insurance: '', permits: '', otherFixedCosts: '',
      maintenance: '', tires: '', tolls: '', otherVariableCosts: '',
    },
  });

  useEffect(() => {
    api.get<Truck[]>('/api/trucks').then(setTrucks).catch(() => setTrucks([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get<Entry[]>('/api/entries').then((list) => {
      const entry = list.find((e) => e.id === id) ?? null;
      setExisting(entry);
      if (entry) {
        const { inputs } = entry;
        Object.entries(inputs).forEach(() => undefined);
        resetForm(entry);
      }
    }).catch((err) => setServerError(err instanceof Error ? err.message : 'Could not load entry.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function resetForm(entry: Entry) {
    reset({
      reportingMonth: entry.reportingMonth,
      truckId: entry.truckId,
      totalMiles: String(entry.inputs.totalMiles),
      gallonsPurchased: String(entry.inputs.gallonsPurchased),
      revenue: String(entry.inputs.revenue),
      fuelSpend: String(entry.inputs.fuelSpend),
      truckPayment: String(entry.inputs.truckPayment),
      insurance: String(entry.inputs.insurance),
      permits: String(entry.inputs.permits),
      otherFixedCosts: String(entry.inputs.otherFixedCosts),
      maintenance: String(entry.inputs.maintenance),
      tires: String(entry.inputs.tires),
      tolls: String(entry.inputs.tolls),
      otherVariableCosts: String(entry.inputs.otherVariableCosts),
    });
  }

  const watched = watch();
  // Live preview uses the SAME engine as the dashboard and reports.
  const live = useMemo(() => {
    try {
      return calculateFinancials(watched as FinancialInput);
    } catch {
      return null;
    }
  }, [watched]);

  const defaultTruckId = trucks[0]?.id ?? '';
  const selectedTruck = watch('truckId') || defaultTruckId;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSaving(true);
    const body = { ...values, truckId: selectedTruck };
    try {
      if (isEdit && id) await api.put(`/api/entries/${id}`, body);
      else await api.post('/api/entries', body);
      navigate('/entries');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not save the entry.');
    } finally {
      setSaving(false);
    }
  });

  const provisional = !live || live.missing.length > 0;

  return (
    <>
      <PageHeader
        title={isEdit ? 'Edit Monthly Entry' : 'Add Monthly Entry'}
        subtitle="Enter your monthly trucking financial information. Use 0 for expenses that do not apply."
      />
      <form onSubmit={onSubmit} className="space-y-5">
        {serverError && <Notice kind="error">{serverError}</Notice>}
        {!existing && isEdit && <Notice kind="info">Loading entry…</Notice>}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="Reporting, Mileage & Revenue">
            <p className="mb-4 text-xs text-muted">One monthly record per truck. USD amounts accept up to two decimal places.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="f_reportingMonth" className="mb-1.5 block text-xs font-bold">Reporting Month</label>
                <input id="f_reportingMonth" type="month" className={`min-h-[46px] w-full rounded-md border bg-white px-3 ${errors.reportingMonth ? 'border-danger' : 'border-input-line'}`} {...register('reportingMonth')} />
                {errors.reportingMonth && <small className="mt-1 block text-danger">{errors.reportingMonth.message}</small>}
              </div>
              <div>
                <label htmlFor="f_truckId" className="mb-1.5 block text-xs font-bold">Truck</label>
                <select id="f_truckId" className="min-h-[46px] w-full rounded-md border border-input-line bg-white px-3" {...register('truckId')}>
                  {trucks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <Field name="totalMiles" label="Total Miles Driven" hint="Up to 3 decimal places" register={register} error={errors.totalMiles?.message} />
              <Field name="gallonsPurchased" label="Gallons Purchased" hint="Up to 3 decimal places" register={register} error={errors.gallonsPurchased?.message} />
              <Field name="fuelSpend" label="Fuel Spend ($)" hint="USD · entered separately from other costs" register={register} error={errors.fuelSpend?.message} />
              <Field name="revenue" label="Total Revenue ($)" hint="USD · up to 2 decimal places" register={register} error={errors.revenue?.message} />
            </div>
          </Card>

          <Card title="Fixed & Variable Operating Costs">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Fixed Operating Costs</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field name="truckPayment" label="Truck Payment ($)" hint="USD" register={register} error={errors.truckPayment?.message} />
              <Field name="insurance" label="Insurance ($)" hint="USD" register={register} error={errors.insurance?.message} />
              <Field name="permits" label="Permits & Licensing ($)" hint="USD" register={register} error={errors.permits?.message} />
              <Field name="otherFixedCosts" label="Other Fixed Costs ($)" hint="USD" register={register} error={errors.otherFixedCosts?.message} />
            </div>
            <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-muted">Variable Operating Costs <span className="font-normal normal-case">(fuel is entered separately)</span></p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field name="maintenance" label="Maintenance ($)" hint="USD" register={register} error={errors.maintenance?.message} />
              <Field name="tires" label="Tires ($)" hint="USD" register={register} error={errors.tires?.message} />
              <Field name="tolls" label="Tolls ($)" hint="USD" register={register} error={errors.tolls?.message} />
              <Field name="otherVariableCosts" label="Other Variable Costs ($)" hint="USD" register={register} error={errors.otherVariableCosts?.message} />
            </div>
          </Card>
        </div>

        <Card title="Live Monthly Summary">
          <div aria-live="polite" aria-atomic="true">
            <p className="mb-4 text-xs text-muted">
              {provisional
                ? 'Complete all numeric fields to calculate your totals. Missing inputs are not treated as confirmed zeroes.'
                : 'Ready to save. Fuel is included exactly once.'}
            </p>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-5 border-b border-line py-2.5">
                  <span className="text-sm">Fuel Spend</span>
                  <b className="tabular">{live && !live.missing.includes('fuelSpend') ? formatMoney(live.fuelSpend) : '—'}</b>
                </div>
                <div className="flex items-center justify-between gap-5 border-b border-line py-2.5">
                  <span className="text-sm">Total Fixed Costs</span>
                  <b className="tabular">{live && !NUMERIC_FIELDS.slice(4, 8).some((f) => live.missing.includes(f)) ? formatMoney(live.fixedCosts) : '—'}</b>
                </div>
                <div className="flex items-center justify-between gap-5 border-b border-line py-2.5">
                  <span className="text-sm">Total Variable Costs</span>
                  <b className="tabular">{live && !NUMERIC_FIELDS.slice(8).some((f) => live.missing.includes(f)) ? formatMoney(live.variableCosts) : '—'}</b>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-5 border-b border-line py-2.5">
                  <span className="text-sm font-bold">Total Operating Costs</span>
                  <b className="tabular text-base">{live && !provisional ? formatMoney(live.totalOperatingCosts) : '—'}</b>
                </div>
                <div className="flex items-center justify-between gap-5 border-b border-line py-2.5">
                  <span className="text-sm font-bold">Estimated Monthly Profit</span>
                  <b className={`tabular text-base ${live && live.estimatedMonthlyProfit >= 0 ? 'text-brand-text' : 'text-danger'}`}>
                    {live && !provisional ? formatMoney(live.estimatedMonthlyProfit) : '—'}
                  </b>
                </div>
                <div className="flex items-center justify-between gap-5 border-b border-line py-2.5">
                  <span className="text-sm font-bold">Profit Margin</span>
                  <b className="tabular text-base">{live && !provisional ? formatPercent(live.profitMarginPercent) : '—'}</b>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-brand-tint px-4 py-3.5 text-sm font-bold leading-relaxed">
              Fuel Spend + Fixed Costs + Variable Costs = Total Operating Costs
              <br />
              {live && !provisional
                ? `${formatMoney(live.fuelSpend)} + ${formatMoney(live.fixedCosts)} + ${formatMoney(live.variableCosts)} = ${formatMoney(live.totalOperatingCosts)}`
                : 'Complete the inputs to see the expense reconciliation.'}
            </div>
            {live && live.notes.length > 0 && provisional && (
              <div className="mt-4">
                <Notice kind="info">{live.notes.map((n) => <span key={n} className="block">{n}</span>)}</Notice>
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Link to="/entries" className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-surface px-5 text-sm font-bold">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="inline-flex min-h-[44px] items-center rounded-md bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Update Monthly Entry' : 'Save Monthly Entry'}
          </button>
        </div>
      </form>
    </>
  );
}
