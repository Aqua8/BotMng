import { capRows, csvCell, formatKst, toCsv } from "./csv";

describe("csvCell", () => {
  it("보통 문자열은 그대로", () => {
    expect(csvCell("발송 완료")).toBe("발송 완료");
    expect(csvCell(123)).toBe("123");
    expect(csvCell(null)).toBe("");
  });

  it("쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싸고 따옴표는 두 번 쓴다", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("줄1\n줄2")).toBe('"줄1\n줄2"');
    expect(csvCell("줄1\r\n줄2")).toBe('"줄1\n줄2"'); // 줄바꿈은 \n 으로 통일
  });

  it("CSV 인젝션 방지: 수식으로 시작하는 문자열 앞에 '를 붙여 Excel 이 실행하지 못하게 한다", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe("\"'=HYPERLINK(\"\"http://evil\"\")\"");
    expect(csvCell("+1+1")).toBe("'+1+1");
    expect(csvCell("-2+3")).toBe("'-2+3");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("\t=1")).toBe("'\t=1");
    expect(csvCell("\r=1")).toBe("\"'\n=1\""); // CR 로 시작해도 막는다 (줄바꿈이 있어 따옴표로 감싸짐)
  });

  it("숫자는 수식 방지 대상이 아니다 (음수도 그대로)", () => {
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(0)).toBe("0");
  });

  it("수식이 아닌 곳에 있는 기호는 건드리지 않는다", () => {
    expect(csvCell("a=b")).toBe("a=b");
    expect(csvCell("[command] /일정추가")).toBe("[command] /일정추가");
  });
});

describe("formatKst", () => {
  it("UTC 시각을 한국 시간 'YYYY-MM-DD HH:mm:ss' 로", () => {
    expect(formatKst(new Date("2026-10-06T12:44:52.251Z"))).toBe("2026-10-06 21:44:52");
    expect(formatKst(new Date("2026-10-06T15:30:00Z"))).toBe("2026-10-07 00:30:00");
  });
});

describe("toCsv", () => {
  const log = (over = {}) => ({ loggedAt: new Date("2026-10-06T12:44:52Z"), level: "info", source: "out", tag: "command", outcome: "success", durationMs: 10558, message: "[command] /일정추가", ...over });

  it("머리글과 행을 만든다 (결과는 한글, 파일은 .log, 시각은 KST)", () => {
    const csv = toCsv([log()]);
    expect(csv.split("\n")).toEqual(["시각(KST),레벨,파일,태그,결과,처리시간(ms),메시지", "2026-10-06 21:44:52,info,out.log,command,성공,10558,[command] /일정추가", ""]);
  });

  it("값이 없으면 빈 칸", () => {
    const row = toCsv([log({ tag: null, outcome: null, durationMs: null })]).split("\n")[1];
    expect(row).toBe("2026-10-06 21:44:52,info,out.log,,,,[command] /일정추가");
  });

  it("실패·취소는 한글로", () => {
    expect(toCsv([log({ outcome: "failure" })])).toContain(",실패,");
    expect(toCsv([log({ outcome: "cancelled" })])).toContain(",취소,");
  });

  it("여러 줄 메시지와 쉼표가 있어도 한 행으로 유지", () => {
    const csv = toCsv([log({ message: "에러: a, b\n  at foo" })]);
    expect(csv).toContain('"에러: a, b\n  at foo"');
  });

  it("메시지가 수식처럼 시작해도 실행되지 않게 막는다", () => {
    expect(toCsv([log({ message: "=cmd|' /C calc'!A0" })])).toContain("'=cmd");
  });

  it("행이 없으면 머리글만", () => {
    expect(toCsv([])).toBe("시각(KST),레벨,파일,태그,결과,처리시간(ms),메시지\n");
  });
});

describe("capRows", () => {
  it("한도 이하면 그대로, 넘으면 한도까지만 자르고 잘렸음을 알린다", () => {
    expect(capRows([1, 2, 3], 5)).toEqual({ rows: [1, 2, 3], truncated: false });
    expect(capRows([1, 2, 3], 3)).toEqual({ rows: [1, 2, 3], truncated: false });
    expect(capRows([1, 2, 3, 4], 3)).toEqual({ rows: [1, 2, 3], truncated: true });
  });
});
