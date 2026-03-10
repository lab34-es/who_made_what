import { useState, useEffect, useCallback } from 'react';

/**
 * Generic fetch hook.
 * @param {string} url
 * @param {object} opts - { autoFetch: true }
 */
export function useApi(url, opts = {}) {
  const { autoFetch = true } = opts;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (autoFetch && url) fetchData();
  }, [autoFetch, url, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Build a URL with query parameters, omitting null/undefined values.
 */
export function buildUrl(base, params = {}) {
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (val == null || val === '') continue;
    // Support arrays: join with comma for multi-value params
    if (Array.isArray(val)) {
      if (val.length > 0) qs.set(key, val.join(','));
    } else {
      qs.set(key, val);
    }
  }
  const str = qs.toString();
  return str ? `${base}?${str}` : base;
}
