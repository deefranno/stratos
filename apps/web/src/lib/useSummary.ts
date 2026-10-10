import { useCallback, useEffect, useState } from 'react';
import { api, type Summary } from './api';

/** Loads the customer's monthly history + selected-month KPIs from the API
 *  (single source of truth: the server-side financial engine). */
export function useSummary(month?: string) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await api.get<Summary>(`/api/entries/summary${month ? `?month=${month}` : ''}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load financial data.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { void reload(); }, [reload]);

  return { summary, error, loading, reload };
}
