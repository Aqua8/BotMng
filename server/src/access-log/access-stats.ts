import type { LoginMethod } from "./access-log.view";

export interface AccessRow {
  success: boolean;
  method: LoginMethod;
  ip: string;
  country: string | null;
}

export interface AccessStats {
  total: number;
  success: number;
  failure: number;
  /** 성공한 접속의 서로 다른 IP 수 (실패한 시도의 IP 는 제외) */
  uniqueVisitors: number;
  byMethod: Record<LoginMethod, number>;
  /** 접속 수 많은 순(같으면 코드순, 국가를 모르는 "??"는 뒤) 상위 8개 */
  byCountry: { country: string; count: number; failure: number }[];
}

const TOP_COUNTRIES = 8;
const UNKNOWN = "??";

/** 접속 로그 행들을 요약한다. IP 같은 개인 식별 값은 결과에 넣지 않고 개수만 센다. */
export function aggregateAccessStats(rows: AccessRow[]): AccessStats {
  const byMethod: Record<LoginMethod, number> = { password: 0, guest: 0, session: 0 };
  const countries = new Map<string, { count: number; failure: number }>();
  const visitors = new Set<string>();
  let success = 0;

  for (const r of rows) {
    byMethod[r.method]++;
    if (r.success) {
      success++;
      visitors.add(r.ip);
    }
    const key = r.country ?? UNKNOWN;
    const c = countries.get(key) ?? { count: 0, failure: 0 };
    c.count++;
    if (!r.success) c.failure++;
    countries.set(key, c);
  }

  const byCountry = [...countries]
    .map(([country, c]) => ({ country, ...c }))
    // 횟수 많은 순. 같으면 국가를 모르는 항목("??")은 뒤로, 나머지는 국가 코드순
    .sort((a, b) => b.count - a.count || Number(a.country === UNKNOWN) - Number(b.country === UNKNOWN) || a.country.localeCompare(b.country))
    .slice(0, TOP_COUNTRIES);

  return { total: rows.length, success, failure: rows.length - success, uniqueVisitors: visitors.size, byMethod, byCountry };
}
