import { useCallback,useMemo,useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Keeps a group of view settings — filters, page, period — in the query string
 * so a view can be linked, bookmarked and reloaded exactly as the user left it.
 *
 * Values equal to their default are dropped from the URL, so an untouched view
 * stays at a clean `/movements`. Writes are a single patch on purpose: several
 * settings often change together (picking a filter also resets the page), and
 * one write keeps them in one URL update instead of two that clobber each other.
 *
 * History is replaced rather than pushed — tweaking a filter shouldn't cost a
 * Back press to undo. Back still moves between views.
 */
export function useQueryState<T extends Record<string, string>>(
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const [params, setParams] = useSearchParams();

  // Defaults are written inline at the call site, so a new object every render.
  // Pinning them keeps `set` stable — views use it inside fetch dependencies.
  const defaultsRef = useRef(defaults);
  const keys = useMemo(() => Object.keys(defaultsRef.current) as (keyof T & string)[], []);

  // A single scalar describing every value, so `state` keeps its identity
  // until one of them actually changes and doesn't retrigger fetch effects.
  // Joined on a character no query value can carry, so neighbouring values
  // can't run together into a signature another combination could also make.
  const signature = keys.map(k => params.get(k) ?? '').join('\u0000');

  const state = useMemo(() => {
    const out = {} as T;
    for (const k of keys) out[k] = (params.get(k) ?? defaultsRef.current[k]) as T[typeof k];
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, keys]);

  const set = useCallback((patch: Partial<T>) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      for (const k of Object.keys(patch) as (keyof T & string)[]) {
        const value = patch[k];
        if (value === undefined) continue;
        if (!value || value === defaultsRef.current[k]) next.delete(k);
        else next.set(k, String(value));
      }
      return next;
    }, { replace: true });
  }, [setParams]);

  return [state, set];
}

/** Single-value form of `useQueryState`, for views with one setting to keep. */
export function useQueryParam(key: string, fallback = ''): [string, (value: string) => void] {
  const [state, set] = useQueryState({ [key]: fallback } as Record<string, string>);
  const setValue = useCallback((value: string) => set({ [key]: value }), [set, key]);
  return [state[key], setValue];
}

/** Reads a number from the query string, clamped to sane bounds. */
export function toInt(value: string, fallback: number, min = 1): number {
  const n = parseInt(value, 10);
  return isNaN(n) || n < min ? fallback : n;
}
