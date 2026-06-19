import { useState, useEffect, useCallback, useRef } from 'react';
import type { Parlay, FetchState } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface UseParlaysReturn {
  parlays: Parlay[];
  bookmakers: string[];
  state: FetchState;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => void;
}

export function useParlays(): UseParlaysReturn {
  const [parlays, setParlays] = useState<Parlay[]>([]);
  const [bookmakers, setBookmakers] = useState<string[]>([]);
  const [state, setState] = useState<FetchState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchParlays = useCallback(async (signal?: AbortSignal) => {
    setState('loading');
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/parlays`, { signal });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status} ${res.statusText}`);
      }

      const raw = await res.json();

      // Log exactly what the backend sent — visible in browser console
      console.log('[useParlays] backend response:', raw);

      // Guard: if the backend wrapped the array in an object, unwrap it
      let data: Parlay[] = [];
      if (Array.isArray(raw)) {
        data = raw;
      } else if (raw && Array.isArray(raw.parlays)) {
        // handles { parlays: [...] } shape
        console.warn('[useParlays] response was {parlays:[...]}, unwrapping');
        data = raw.parlays;
      } else {
        console.warn('[useParlays] unexpected response shape:', typeof raw, raw);
      }

      setParlays(data);

      // Bookmakers: prefer the explicit list from the backend.
      // Falls back to an empty list if the backend hasn't been updated yet.
      const books: string[] =
        raw && Array.isArray(raw.bookmakers) ? raw.bookmakers : [];
      setBookmakers(books);

      setLastUpdated(new Date());
      setState('success');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Unexpected error fetching parlays.';
      console.error('[useParlays] fetch failed:', msg);
      setError(msg);
      setState('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchParlays(controller.signal);
    return () => controller.abort();
  }, [fetchParlays]);

  const fetchRef = useRef(fetchParlays);
  fetchRef.current = fetchParlays;

  useEffect(() => {
    const id = setInterval(() => {
      fetchRef.current();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return { parlays, bookmakers, state, error, lastUpdated, refetch: fetchParlays };
}
