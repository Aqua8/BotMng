import { aggregateCommandStats, commandNameOf } from "./command-stats";

describe("commandNameOf", () => {
  it("[command] 뒤 첫 토큰을 명령 이름으로", () => {
    expect(commandNameOf("[command] /일정추가")).toBe("/일정추가");
  });

  it("': 사유'는 이름에 포함하지 않는다", () => {
    expect(commandNameOf("[command] /일정추가: Google API 오류(403)")).toBe("/일정추가");
  });

  it("/비서는 해석된 동작까지 이름에 포함한다", () => {
    expect(commandNameOf("[command] /비서(일정삭제)")).toBe("/비서(일정삭제)");
    expect(commandNameOf("[command] /비서(일정삭제): 시간 초과")).toBe("/비서(일정삭제)");
  });

  it("[command] 형식이 아니면 null", () => {
    expect(commandNameOf("[daily] 발송 완료")).toBeNull();
    expect(commandNameOf("[command] ")).toBeNull();
  });
});

describe("aggregateCommandStats", () => {
  const row = (message: string, outcome: "success" | "failure" | "cancelled" | null, durationMs: number | null) => ({ message, outcome, durationMs });

  it("비어 있으면 0건이고 평균은 null", () => {
    expect(aggregateCommandStats([])).toEqual({ total: 0, success: 0, failure: 0, cancelled: 0, avgMs: null, byCommand: [] });
  });

  it("전체와 명령별로 횟수·결과·평균·최대를 센다 (횟수 많은 명령부터)", () => {
    const r = aggregateCommandStats([
      row("[command] /일정추가", "success", 1000),
      row("[command] /일정추가", "success", 3000),
      row("[command] /일정추가: Google API 오류(403)", "failure", 2000),
      row("[command] /오늘일정", "success", 500),
      row("[command] /일정삭제: 시간 초과", "cancelled", 800),
    ]);
    expect(r).toMatchObject({ total: 5, success: 3, failure: 1, cancelled: 1, avgMs: 1460 });
    expect(r.byCommand.map((c) => c.command)).toEqual(["/일정추가", "/오늘일정", "/일정삭제"]);
    expect(r.byCommand[0]).toEqual({ command: "/일정추가", count: 3, success: 2, failure: 1, cancelled: 0, avgMs: 2000, maxMs: 3000 });
    expect(r.byCommand[2]).toMatchObject({ command: "/일정삭제", count: 1, cancelled: 1, avgMs: 800, maxMs: 800 });
  });

  it("횟수가 같으면 이름순으로 고정한다", () => {
    const r = aggregateCommandStats([row("[command] /b", "success", 1), row("[command] /a", "success", 1)]);
    expect(r.byCommand.map((c) => c.command)).toEqual(["/a", "/b"]);
  });

  it("/비서는 동작별로 따로 센다", () => {
    const r = aggregateCommandStats([row("[command] /비서(일정삭제)", "success", 1), row("[command] /비서(일정추가)", "success", 1), row("[command] /비서(일정추가)", "success", 1)]);
    expect(r.byCommand.map((c) => [c.command, c.count])).toEqual([["/비서(일정추가)", 2], ["/비서(일정삭제)", 1]]);
  });

  it("처리시간이 없는 행은 횟수에는 넣고 평균·최대에서는 뺀다", () => {
    const r = aggregateCommandStats([row("[command] /오늘일정", "success", 1000), row("[command] /오늘일정", "success", null)]);
    expect(r.byCommand[0]).toMatchObject({ count: 2, avgMs: 1000, maxMs: 1000 });
    expect(r.avgMs).toBe(1000);
    const none = aggregateCommandStats([row("[command] /오늘일정", "success", null)]);
    expect(none.byCommand[0]).toMatchObject({ count: 1, avgMs: null, maxMs: null });
    expect(none.avgMs).toBeNull();
  });

  it("결과(outcome)가 없는 줄(형식이 다른 [command] 줄)과 명령 이름이 없는 줄은 세지 않는다", () => {
    const r = aggregateCommandStats([row("[command] 알 수 없는 형식", null, null), row("[daily] 발송 완료", "success", 5), row("[command] /오늘일정", "success", 10)]);
    expect(r.total).toBe(1);
    expect(r.byCommand.map((c) => c.command)).toEqual(["/오늘일정"]);
  });

  it("평균은 반올림한 정수 ms", () => {
    const r = aggregateCommandStats([row("[command] /a", "success", 1), row("[command] /a", "success", 2)]);
    expect(r.byCommand[0].avgMs).toBe(2); // 1.5 → 2
  });
});
