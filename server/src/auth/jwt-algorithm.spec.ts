import jwt from "jsonwebtoken";
import { JWT_ALGORITHM } from "./token-user";

describe("JWT 알고리즘 고정 (verify 옵션에 JWT_ALGORITHM 만 허용)", () => {
  const secret = "test-secret-test-secret-test-secret";
  const verify = (token: string) => jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] });

  it("허용한 알고리즘(HS256)으로 서명한 토큰은 통과", () => {
    expect(verify(jwt.sign({ sub: 1 }, secret, { algorithm: "HS256" }))).toMatchObject({ sub: 1 });
  });

  it("같은 키라도 다른 알고리즘(HS512)으로 서명한 토큰은 거절", () => {
    expect(() => verify(jwt.sign({ sub: 1 }, secret, { algorithm: "HS512" }))).toThrow(/invalid algorithm/);
  });

  it("서명 없는 토큰(alg: none)은 거절", () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    expect(() => verify(`${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: 1 })}.`)).toThrow();
  });
});
