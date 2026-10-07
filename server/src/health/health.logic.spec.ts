import { In, Not } from "typeorm";
import { SourceStatus, accessLogFilter, describeCollectorError, evaluateHealth, lagBytes } from "./health.logic";

const NOW = new Date("2026-10-07T00:30:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

const source = (over: Partial<SourceStatus> = {}): SourceStatus => ({
  source: "out",
  fileSize: 1000,
  offset: 1000,
  lagBytes: 0,
  fileMissing: false,
  lastPollAt: ago(500),
  lastReadAt: ago(60_000),
  lastError: null,
  ...over,
});
const dbOk = { ok: true as const };
const dbDown = { ok: false as const };

describe("lagBytes", () => {
  it("파일 크기에서 읽은 위치를 뺀다 (크기를 모르면 null)", () => {
    expect(lagBytes(1000, 400)).toBe(600);
    expect(lagBytes(1000, 1000)).toBe(0);
    expect(lagBytes(null, 400)).toBeNull();
  });

  it("파일이 줄어든 경우(비워짐·교체)는 음수가 아니라 0", () => {
    expect(lagBytes(100, 400)).toBe(0);
  });
});

describe("describeCollectorError", () => {
  it("오류를 종류 이름으로만 바꾼다 (메시지에는 로컬 경로가 있을 수 있어 노출하지 않음)", () => {
    expect(describeCollectorError(Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:3306"), { code: "ECONNREFUSED" }))).toBe("DB 연결 오류");
    expect(describeCollectorError(Object.assign(new Error("ENOENT: /Users/someone/data/out.log"), { code: "ENOENT" }))).toBe("로그 파일 없음");
    expect(describeCollectorError(Object.assign(new Error("EACCES: /Users/someone/x"), { code: "EACCES" }))).toBe("로그 파일 권한 없음");
    expect(describeCollectorError(Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" }))).toBe("DB 오류");
    expect(describeCollectorError(new Error("뭔가 /Users/someone/secret"))).toBe("수집 오류");
    expect(describeCollectorError("문자열")).toBe("수집 오류");
    expect(describeCollectorError(new Error("x /Users/someone"))).not.toContain("/Users");
  });
});

describe("evaluateHealth", () => {
  it("모두 정상이면 ok", () => {
    expect(evaluateHealth({ db: dbOk, sources: [source(), source({ source: "error" })] }, NOW)).toEqual({ status: "ok", issues: [] });
  });

  it("DB 연결이 안 되면 error", () => {
    const r = evaluateHealth({ db: dbDown, sources: [source()] }, NOW);
    expect(r.status).toBe("error");
    expect(r.issues).toContain("DB에 연결할 수 없습니다");
  });

  it("수집기가 오래 확인하지 않았으면 error (멈춘 것)", () => {
    const r = evaluateHealth({ db: dbOk, sources: [source({ lastPollAt: ago(30_000) })] }, NOW);
    expect(r.status).toBe("error");
    expect(r.issues.join()).toContain("수집기가 멈춘");
  });

  it("아직 한 번도 확인하지 못했다면(시작 직후) 문제로 보지 않는다", () => {
    expect(evaluateHealth({ db: dbOk, sources: [source({ lastPollAt: null })] }, NOW).status).toBe("ok");
  });

  it("로그 파일이 없으면 warn", () => {
    const r = evaluateHealth({ db: dbOk, sources: [source({ fileMissing: true, fileSize: null, lagBytes: null })] }, NOW);
    expect(r.status).toBe("warn");
    expect(r.issues.join()).toContain("로그 파일");
  });

  it("지연이 크면 warn, 작으면(쓰는 중인 줄) 정상", () => {
    expect(evaluateHealth({ db: dbOk, sources: [source({ lagBytes: 200_000 })] }, NOW).status).toBe("warn");
    expect(evaluateHealth({ db: dbOk, sources: [source({ lagBytes: 300 })] }, NOW).status).toBe("ok");
  });

  it("최근 1분 안의 수집 오류는 warn, 오래된 오류는 무시", () => {
    expect(evaluateHealth({ db: dbOk, sources: [source({ lastError: { kind: "DB 오류", at: ago(20_000) } })] }, NOW).status).toBe("warn");
    expect(evaluateHealth({ db: dbOk, sources: [source({ lastError: { kind: "DB 오류", at: ago(600_000) } })] }, NOW).status).toBe("ok");
  });

  it("error 가 warn 보다 우선한다", () => {
    const r = evaluateHealth({ db: dbDown, sources: [source({ lagBytes: 999_999 })] }, NOW);
    expect(r.status).toBe("error");
    expect(r.issues.length).toBeGreaterThanOrEqual(2);
  });
});

describe("accessLogFilter (accessLogCount 에서 서비스 접속 빼기)", () => {
  it("관리자는 모두 센다", () => {
    expect(accessLogFilter("admin")).toEqual({});
  });

  it("게스트와 서비스 계정은 서비스 접속 행을 뺀다 (접속 요약 패널과 같은 기준)", () => {
    for (const role of ["guest", "service"] as const) {
      expect(accessLogFilter(role)).toEqual({ method: Not(In(["service"])) });
    }
  });
});
