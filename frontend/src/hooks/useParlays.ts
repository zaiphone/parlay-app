import { useState, useEffect, useCallback, useRef } from 'react';
import type { Parlay, FetchState } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface UseParlaysReturn {
  parlays: Parlay[];
  state: FetchState;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => void;
}

/**
 * Fetches parlay suggestions from /api/parlays and auto-refreshes
 * every 10 minutes. Returns fetch state, data, error, and a manual
 * refetch trigger.
 */
export function useParlays(): UseParlaysReturn {
  const [parlays, setParlays] = useState<Parlay[]>([]);
  const [state, setState] = useState<FetchState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Stable fetch function that doesn't trigger useEffect re-runs
  const fetchParlays = useCallback(async (signal?: AbortSignal) => {
    setState('loading');
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/parlays`, { signal });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status} ${res.statusText}`);
      }

      const data: Parlay[] = await res.json();
      setParlays(data);
      setLastUpdated(new Date());
      setState('success');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // Unmount cleanup — not a real error

      const msg =
        err instanceof Error ? err.message : 'Unexpected error fetching parlays.';

      console.error('[useParlays]', msg);
      setError(msg);
      setState('error');
    }
  }, []);

  // Initial fetch + cleanup on unmount
  useEffect(() => {
    const controller = new AbortController();
    fetchParlays(controller.signal);
    return () => controller.abort();
  }, [fetchParlays]);

  // Background polling every 10 minutes
  const fetchRef = useRef(fetchParlays);
  fetchRef.current = fetchParlays;

  useEffect(() => {
    const id = setInterval(() => {
      fetchRef.current();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return {
    parlays,
    state,
    error,
    lastUpdated,
    refetch: fetchParlays,
  };
}
