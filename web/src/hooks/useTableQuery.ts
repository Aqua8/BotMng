import { useCallback, useEffect, useRef, useState } from "react";
import { Paged, SortOrder, TableQuery } from "../api";

export interface SortState {
  key: string;
  order: SortOrder;
}
/** 정렬을 고르지 않은 기본 상태(시각 내림차순). 화면에는 이 값으로 표시한다. */
export const DEFAULT_SORT: SortState = { key: "loggedAt", order: "desc" };

/**
 * 페이지·페이지 크기·정렬 상태를 가진 서버 페이지네이션 테이블용 훅.
 * filterKey 가 바뀌면 (debounceMs 만큼 기다린 뒤) 1페이지부터 다시 조회하고, 페이지나 정렬을 바꾸면 바로 조회한다.
 * 실시간으로 들어오는 줄은 setRows / setTotal 로 직접 반영한다.
 */
export function useTableQuery<T>(fetchPage: (q: TableQuery) => Promise<Paged<T>>, filterKey: string, { debounceMs = 0, onReset }: { debounceMs?: number; onReset?: () => void } = {}) {
  const [pageSize, setPageSizeState] = useState(20);
  const [sort, setSortState] = useState<SortState | null>(null); // null = 기본(시각 내림차순)
  // 필터가 바뀌면 자동으로 1페이지가 되도록, 페이지에 어느 필터에서의 값인지를 함께 저장한다.
  const [pageState, setPageState] = useState({ filterKey, page: 1 });
  const page = pageState.filterKey === filterKey ? pageState.page : 1;

  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const resetRef = useRef(onReset);
  resetRef.current = onReset;
  const lastFilterKey = useRef(filterKey);

  const sortKey = sort ? `${sort.key}:${sort.order}` : "";
  useEffect(() => {
    let cancelled = false;
    const filterChanged = lastFilterKey.current !== filterKey;
    lastFilterKey.current = filterKey;
    const t = setTimeout(
      () => {
        setLoading(true);
        fetchRef
          .current({ page, pageSize, sort: sort?.key, order: sort?.order })
          .then((p) => {
            if (cancelled) return;
            setRows(p.items);
            setTotal(p.total);
            setError("");
            resetRef.current?.();
          })
          .catch((e: Error) => !cancelled && setError(e.message))
          .finally(() => !cancelled && setLoading(false));
      },
      filterChanged ? debounceMs : 0, // 검색어 입력 중에만 기다리고 페이지 이동은 즉시
    );
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, page, pageSize, sortKey, tick]);

  const setPage = useCallback((p: number) => setPageState({ filterKey, page: p }), [filterKey]);
  const setPageSize = useCallback((n: number) => {
    setPageSizeState(n);
    setPageState({ filterKey, page: 1 });
  }, [filterKey]);
  const setSort = useCallback((s: SortState | null) => {
    setSortState(s);
    setPageState({ filterKey, page: 1 });
  }, [filterKey]);

  return {
    rows, setRows, total, setTotal, loading, error,
    page, pageSize, sort, setPage, setPageSize, setSort,
    /** 1페이지 + 기본 정렬. 실시간 새 로그를 끼워 넣을 수 있는 상태 */
    atHome: page === 1 && sort === null,
    resetView: useCallback(() => {
      setSortState(null);
      setPageState({ filterKey, page: 1 });
    }, [filterKey]),
    reload: () => setTick((n) => n + 1),
  };
}

/** 열 머리글을 누를 때의 정렬 순환: 내림차순 → 오름차순 → 기본(시각 내림차순). 다른 열을 누르면 그 열의 내림차순부터. */
export function nextSort(current: SortState | null, key: string): SortState | null {
  const eff = current ?? DEFAULT_SORT;
  if (eff.key !== key) return { key, order: "desc" };
  return eff.order === "desc" ? { key, order: "asc" } : null;
}
