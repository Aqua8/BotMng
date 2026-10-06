import { AccessLogRow, allowedAccessSorts, toView } from "./access-log.view";

const log = (over: Partial<AccessLogRow> = {}): AccessLogRow => ({
    id: 1,
    loggedAt: new Date("2026-10-06T06:00:00Z"),
    username: "admin",
    success: true,
    method: "password",
    ip: "203.0.113.42",
    country: "KR",
    os: "macOS",
    browser: "Chrome 154",
    device: "desktop",
    userAgent: "Mozilla/5.0 (secret-ua)",
    ...over,
});

describe("toView (역할별 마스킹)", () => {
  it("관리자는 모든 값을 본다", () => {
    expect(toView(log(), "admin")).toMatchObject({ username: "admin", ip: "203.0.113.42", userAgent: "Mozilla/5.0 (secret-ua)" });
});

  it("게스트는 IP가 가려지고 User-Agent 원문이 없다", () => {
    const v = toView(log(), "guest");
    expect(v.ip).toBe("203.0.***.***");
    expect(v.userAgent).toBeNull();
    expect(JSON.stringify(v)).not.toContain("203.0.113.42");
    expect(JSON.stringify(v)).not.toContain("secret-ua");
});

  it("게스트에게는 성공한 로그인의 아이디만 보이고 실패한 시도의 아이디는 숨긴다", () => {
    expect(toView(log({ success: true }), "guest").username).toBe("admin");
    const failed = toView(log({ success: false, username: "my-typo-password" }), "guest");
    expect(failed.username).toBeNull();
    expect(JSON.stringify(failed)).not.toContain("my-typo-password");
});

  it("관리자는 실패한 시도의 아이디도 본다", () => {
    expect(toView(log({ success: false, username: "hacker" }), "admin").username).toBe("hacker");
});
});

describe("method=session (저장된 로그인으로 다시 접속)", () => {
  it("관리자·게스트 모두 방식이 그대로 보이고, 성공한 기록이라 게스트에게도 계정이 보인다", () => {
    expect(toView(log({ method: "session" }), "admin").method).toBe("session");
    const g = toView(log({ method: "session", success: true }), "guest");
    expect(g.method).toBe("session");
    expect(g.username).toBe("admin");
    expect(g.ip).toBe("203.0.***.***");
  });
});

describe("allowedAccessSorts (게스트의 정렬 제한)", () => {
  it("관리자는 모든 열로 정렬할 수 있다", () => {
    const admin = allowedAccessSorts("admin");
    for (const col of ["loggedAt", "username", "success", "method", "ip", "country", "os", "browser", "device"]) expect(admin).toContain(col);
  });

  it("게스트는 가려진 값(IP, 아이디)으로는 정렬할 수 없다 — 순서로 숨긴 값을 유추하지 못하게", () => {
    const guest = allowedAccessSorts("guest");
    expect(guest).not.toContain("ip");
    expect(guest).not.toContain("username");
    for (const col of ["loggedAt", "success", "method", "country", "os", "browser", "device"]) expect(guest).toContain(col);
  });
});
