import { useCallback, useEffect, useRef, useState } from "react";

export interface Page<T> {
  items: T[];
  nextCursor: number | null;
}

/**
 * 커서 페이지네이션 목록 상태. deps 가 바뀌면 (debounceMs 만큼 기다린 뒤) 첫 페이지부터 다시 조회하고,
 * loadMore 는 nextCursor 로 다음 페이지를 이어 붙인다. 실시간으로 들어오는 줄은 setRows 로 직접 넣는다.
 */
export function usePagedList<T>(
  fetchPage: (before?: number) => Promise<Page<T>>,
  deps: unknown[],
  { debounceMs = 0, onReset }: { debounceMs?: number; onReset?: () => void } = {},
) {
  const [rows, setRows] = useState<T[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const resetRef = useRef(onReset);
  resetRef.current = onReset;

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      fetchRef
        .current()
        .then((p) => {
          if (cancelled) return;
          setRows(p.items);
          setCursor(p.nextCursor);
          setError("");
          resetRef.current?.();
        })
        .catch((e: Error) => !cancelled && setError(e.message))
        .finally(() => !cancelled && setLoading(false));
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const loadMore = useCallback(async () => {
    if (cursor === null) return;
    setLoading(true);
    try {
      const p = await fetchRef.current(cursor);
      setRows((prev) => [...prev, ...p.items]);
      setCursor(p.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  return { rows, setRows, hasMore: cursor !== null, loading, error, loadMore, reload: () => setTick((n) => n + 1) };
}
