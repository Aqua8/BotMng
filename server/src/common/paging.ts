/** 목록 조회 공통: 페이지 크기, 오프셋 계산, 정렬 열 검증. Nest 에 의존하지 않는 순수 함수라 단위 테스트가 쉽다. */
export const PAGE_SIZES = [5, 10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export const pageOffset = (page: number, pageSize: number) => (page - 1) * pageSize;

export interface Sort {
  column: string;
  direction: "ASC" | "DESC";
}

/**
 * 요청한 정렬을 허용된 열 목록과 대조한다. 지정하지 않으면 시각 내림차순.
 * 허용되지 않은 열이면 null — 컬럼 이름은 SQL 에 그대로 들어가므로 반드시 허용 목록에 있는 것만 통과시킨다.
 */
export function resolveSort(sort: string | undefined, order: "asc" | "desc" | undefined, allowed: readonly string[]): Sort | null {
  if (!sort) return { column: "loggedAt", direction: "DESC" };
  if (!allowed.includes(sort)) return null;
  return { column: sort, direction: order === "asc" ? "ASC" : "DESC" };
}
