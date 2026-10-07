import * as bcrypt from "bcryptjs";
import { checkPassword } from "./password-check";

jest.mock("bcryptjs", () => {
  const actual = jest.requireActual("bcryptjs");
  return { ...actual, compare: jest.fn(actual.compare) };
});

describe("checkPassword (계정이 없어도 같은 비용으로 비교)", () => {
  const hash = bcrypt.hashSync("correct-password-12", 4);
  const compareMock = bcrypt.compare as unknown as jest.Mock;

  beforeEach(() => compareMock.mockClear());

  it("맞는 비밀번호는 true, 틀리면 false", async () => {
    expect(await checkPassword(hash, "correct-password-12")).toBe(true);
    expect(await checkPassword(hash, "wrong-password-123")).toBe(false);
  });

  it("해시가 없으면(계정 없음) 항상 false 이면서도 bcrypt 비교를 실제로 한다", async () => {
    expect(await checkPassword(undefined, "anything-at-all-1")).toBe(false);
    expect(compareMock).toHaveBeenCalledTimes(1);
    expect(String(compareMock.mock.calls[0][1])).toMatch(/^\$2[aby]\$10\$/); // 실제 계정과 같은 비용(10)의 가짜 해시
  });
});
