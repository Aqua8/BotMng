import { aggregateAccessStats } from "./access-stats";

type Row = Parameters<typeof aggregateAccessStats>[0][number];
const row = (over: Partial<Row> = {}): Row => ({ success: true, method: "password", ip: "203.0.113.1", country: "KR", ...over });

describe("aggregateAccessStats", () => {
  it("비어 있으면 모두 0", () => {
    expect(aggregateAccessStats([])).toEqual({ total: 0, success: 0, failure: 0, uniqueVisitors: 0, byMethod: { password: 0, guest: 0, session: 0 }, byCountry: [] });
  });

  it("전체·성공·실패와 방식별로 센다", () => {
    const r = aggregateAccessStats([row(), row({ method: "guest" }), row({ method: "session" }), row({ success: false }), row({ success: false, method: "guest" })]);
    expect(r).toMatchObject({ total: 5, success: 3, failure: 2, byMethod: { password: 2, guest: 2, session: 1 } });
  });

  it("고유 접속자는 성공한 접속의 서로 다른 IP 수 (실패한 시도의 IP는 제외)", () => {
    const r = aggregateAccessStats([
      row({ ip: "1.1.1.1" }),
      row({ ip: "1.1.1.1", method: "session" }),
      row({ ip: "2.2.2.2", method: "guest" }),
      row({ ip: "9.9.9.9", success: false }),
    ]);
    expect(r.uniqueVisitors).toBe(2);
  });

  it("국가별 접속 수와 그중 실패 수 (많은 순, 같으면 국가 코드순), 모르면 '??'", () => {
    const r = aggregateAccessStats([
      row({ country: "KR" }), row({ country: "KR" }), row({ country: "KR", success: false }),
      row({ country: "US", success: false }), row({ country: "JP" }), row({ country: null }),
    ]);
    expect(r.byCountry).toEqual([
      { country: "KR", count: 3, failure: 1 },
      { country: "JP", count: 1, failure: 0 },
      { country: "US", count: 1, failure: 1 },
      { country: "??", count: 1, failure: 0 },
    ]);
  });

  it("국가는 상위 8개까지만", () => {
    const rows = Array.from({ length: 12 }, (_, i) => row({ country: String.fromCharCode(65 + i) + "X" }));
    expect(aggregateAccessStats(rows).byCountry).toHaveLength(8);
  });

  it("응답에 IP 같은 개인 식별 값이 들어가지 않는다 (개수만)", () => {
    const json = JSON.stringify(aggregateAccessStats([row({ ip: "203.0.113.77" })]));
    expect(json).not.toContain("203.0.113.77");
  });
});
