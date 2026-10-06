import { AccessLogRow, toView } from "./access-log.view";

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
    expect(v.ip).toBe("203.0.113.*");
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
