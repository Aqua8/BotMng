import { isDbCheckSatisfied, isRoleAllowed } from "./role-access";

describe("isRoleAllowed (서비스 계정 최소 권한)", () => {
  it("서비스 계정은 허용 표시가 없는 API 를 쓸 수 없다", () => {
    expect(isRoleAllowed("service", false)).toBe(false);
  });

  it("서비스 계정은 허용 표시가 있는 API(/api/health)만 쓸 수 있다", () => {
    expect(isRoleAllowed("service", true)).toBe(true);
  });

  it("관리자와 게스트는 허용 표시와 상관없이 기존대로 쓴다", () => {
    for (const role of ["admin", "guest"] as const) {
      expect(isRoleAllowed(role, false)).toBe(true);
      expect(isRoleAllowed(role, true)).toBe(true);
    }
  });
});

describe("isDbCheckSatisfied (계정을 DB 로 확인하지 못한 토큰)", () => {
  it("DB 로 확인한 토큰은 어디서나 통과", () => {
    expect(isDbCheckSatisfied(undefined, false)).toBe(true);
    expect(isDbCheckSatisfied(false, false)).toBe(true);
  });

  it("확인하지 못한 토큰은 상태 API(@AllowWhenDbDown)에서만 통과", () => {
    expect(isDbCheckSatisfied(true, false)).toBe(false);
    expect(isDbCheckSatisfied(true, true)).toBe(true);
  });
});
