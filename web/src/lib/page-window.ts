/**
 * 표시할 페이지 번호 목록. 처음·끝과 현재 주변만 보이고 생략 구간은 "…" 로 줄인다. 예) 1 … 9 10 11 … 20
 * 건너뛰는 페이지가 딱 하나뿐이면 "…" 대신 그 페이지를 그대로 보여준다.
 */
export function pageWindow(page: number, last: number): (number | "…")[] {
  const keep = [...new Set([1, last, page - 1, page, page + 1].filter((n) => n >= 1 && n <= last))].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of keep) {
    if (n - prev === 2) out.push(prev + 1);
    else if (n - prev > 2) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}
