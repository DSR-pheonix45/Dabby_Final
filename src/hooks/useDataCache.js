import { useState, useEffect, useRef } from "react";

const globalCache = {};

export function useDataCache(key, fetcher) {
  const [data, setData] = useState(() => globalCache[key] || null);
  const [isLoading, setIsLoading] = useState(!globalCache[key]);
  const [error, setError] = useState(null);

  // Store fetcher in ref to avoid triggering useEffect if function reference changes
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const execute = async () => {
    if (!key) return;
    try {
      const result = await fetcherRef.current();
      globalCache[key] = result;
      setData(result);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${key}:`, err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!key) {
      setData(null);
      setIsLoading(false);
      return;
    }

    if (!globalCache[key]) {
      setIsLoading(true);
    }

    execute();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const mutate = (newData) => {
    globalCache[key] = newData;
    setData(newData);
  };

  return { data, isLoading, error, refetch: execute, mutate };
}
