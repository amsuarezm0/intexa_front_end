import { useState, useEffect, type DependencyList } from 'react';

export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
  errorMessage = 'Error al cargar los datos.',
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    fetcher()
      .then(d  => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(errorMessage); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, rev]);

  return { data, isLoading, error, refetch: () => setRev(r => r + 1) };
}
