import { parseChunk } from "./log-parser";

const fallback = new Date("2026-01-01T00:00:00.000Z");

describe("parseChunk", () => {
  it("타임스탬프/레벨/태그를 파싱한다", () => {
    const [e] = parseChunk("out", "2026-10-06T06:00:00.000Z INFO [daily] 발송 완료 (1건)\n", 0, fallback);
    expect(e).toMatchObject({
      source: "out",
      level: "info",
      tag: "daily",
      message: "[daily] 발송 완료 (1건)",
      fileOffset: 0,
    });
    expect(e.loggedAt.toISOString()).toBe("2026-10-06T06:00:00.000Z");
  });

  it("한국 시간(+09:00) 타임스탬프를 UTC 시각으로 해석한다", () => {
    const [e] = parseChunk("out", "2026-10-06T15:00:00.000+09:00 INFO [daily] x\n", 0, fallback);
    expect(e.loggedAt.toISOString()).toBe("2026-10-06T06:00:00.000Z");
    expect(e.tag).toBe("daily");
  });

  it("타임스탬프 없는 줄은 직전 항목의 연속 줄로 합친다 (스택트레이스)", () => {
    const text = "2026-10-06T06:00:00.000Z ERROR [daily] 실패: Error: x\n    at foo (a.ts:1)\n    at bar (b.ts:2)\n";
    const entries = parseChunk("error", text, 0, fallback);
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe("[daily] 실패: Error: x\n    at foo (a.ts:1)\n    at bar (b.ts:2)");
  });

  it("레거시 로그는 fallback 시각을 쓰고 source로 레벨을 정한다", () => {
    const entries = parseChunk("out", "[poll] 변경 감지\n", 0, fallback);
    expect(entries[0]).toMatchObject({ level: "info", tag: "poll", loggedAt: fallback });
  });

  it("레거시 줄들은 서로 합치지 않고 각각 항목이 된다", () => {
    const entries = parseChunk("out", "[a] 하나\n[b] 둘\n", 0, fallback);
    expect(entries.map((e) => e.tag)).toEqual(["a", "b"]);
  });

  it("(node: 로 시작하는 경고는 새 항목이며 warn 이다", () => {
    const text = "2026-10-06T06:00:00.000Z ERROR [a] 실패\n(node:1) Warning: x\n(Use `node --trace-warnings`)\n";
    const entries = parseChunk("error", text, 0, fallback);
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({ level: "warn", message: "(node:1) Warning: x\n(Use `node --trace-warnings`)" });
  });

  it("fileOffset은 항목 첫 줄의 바이트 위치(base 포함)다", () => {
    const l1 = "2026-10-06T06:00:00.000Z INFO [a] 한글\n";
    const entries = parseChunk("out", l1 + "2026-10-06T06:00:01.000Z INFO [b] x\n", 100, fallback);
    expect(entries.map((e) => e.fileOffset)).toEqual([100, 100 + Buffer.byteLength(l1)]);
  });

  it("빈 줄은 무시한다", () => {
    expect(parseChunk("out", "\n\n", 0, fallback)).toHaveLength(0);
  });
});

describe("명령 로그([command]) 분리", () => {
  const parse = (text: string) => parseChunk("out", text, 0, fallback);

  it("성공: 결과와 처리시간을 별도 값으로 빼고 메시지에서는 지운다", () => {
    const [e] = parse("2026-10-06T21:44:52.251+09:00 INFO [command] /일정추가 성공 (10558ms)\n");
    expect(e).toMatchObject({ tag: "command", level: "info", outcome: "success", durationMs: 10558, message: "[command] /일정추가" });
  });

  it("실패: 사유는 메시지에 남긴다", () => {
    const [e] = parse("2026-10-06T21:44:52.251+09:00 WARN [command] /일정추가 실패 (80ms): Google API 오류(403)\n");
    expect(e).toMatchObject({ level: "warn", outcome: "failure", durationMs: 80, message: "[command] /일정추가: Google API 오류(403)" });
  });

  it("취소: 사유는 메시지에 남긴다", () => {
    const [e] = parse("2026-10-06T21:44:52.251+09:00 INFO [command] /일정삭제 취소 (320ms): 시간 초과\n");
    expect(e).toMatchObject({ outcome: "cancelled", durationMs: 320, message: "[command] /일정삭제: 시간 초과" });
  });

  it("/비서(동작) 처럼 괄호가 붙은 명령 이름도 그대로", () => {
    const [e] = parse("2026-10-06T21:44:52.251+09:00 INFO [command] /비서(일정삭제) 성공 (7ms)\n");
    expect(e).toMatchObject({ outcome: "success", durationMs: 7, message: "[command] /비서(일정삭제)" });
  });

  it("명령 로그가 아닌 줄은 결과·처리시간이 null 이고 메시지는 그대로다", () => {
    const [e] = parse("2026-10-06T21:44:52.251+09:00 INFO [daily] 발송 완료 (1건) (300ms)\n");
    expect(e).toMatchObject({ outcome: null, durationMs: null, message: "[daily] 발송 완료 (1건) (300ms)" });
  });

  it("[command] 태그여도 형식이 다르면 건드리지 않는다", () => {
    const [e] = parse("2026-10-06T21:44:52.251+09:00 INFO [command] 알 수 없는 형식\n");
    expect(e).toMatchObject({ outcome: null, durationMs: null, message: "[command] 알 수 없는 형식" });
  });

  it("레거시(타임스탬프 없는) 줄도 null", () => {
    const [e] = parse("[poll] 변경 감지\n");
    expect(e).toMatchObject({ outcome: null, durationMs: null });
  });
});
