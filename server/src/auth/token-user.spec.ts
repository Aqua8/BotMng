import { isTokenUserCurrent } from "./token-user";

const payload = { sub: 3, username: "devmng", role: "service" as const };

describe("isTokenUserCurrent (토큰 발급 뒤 계정이 바뀐 경우)", () => {
  it("계정이 그대로면 통과", () => {
    expect(isTokenUserCurrent(payload, { username: "devmng", role: "service" })).toBe(true);
  });

  it("계정이 지워졌으면 거절 (서비스 계정을 끈 경우)", () => {
    expect(isTokenUserCurrent(payload, null)).toBe(false);
  });

  it("역할이 바뀌었으면 거절 (예: 게스트가 관리자 토큰을 갖고 있던 경우를 막음)", () => {
    expect(isTokenUserCurrent({ ...payload, role: "admin" }, { username: "devmng", role: "service" })).toBe(false);
  });

  it("아이디가 바뀌었으면 거절 (같은 id 를 다른 계정이 쓰게 된 경우)", () => {
    expect(isTokenUserCurrent(payload, { username: "other", role: "service" })).toBe(false);
  });
});
