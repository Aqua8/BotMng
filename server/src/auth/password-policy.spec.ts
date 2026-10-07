import { checkSeedPasswords, MIN_PASSWORD_LENGTH, passwordPolicyMessage } from "./password-policy";

const strong = (seed: string) => `${seed}-Vq7!xT2mK9pL`; // 14자 이상, 서로 다른 문자 충분

describe("checkSeedPasswords", () => {
  it("충분히 길고 서로 다른 비밀번호는 통과한다", () => {
    expect(checkSeedPasswords({ ADMIN_PASSWORD: strong("a"), GUEST_PASSWORD: strong("g"), DEVMNG_PASSWORD: strong("d") })).toEqual([]);
  });

  it("너무 짧으면 거부한다 (6자리 숫자)", () => {
    const problems = checkSeedPasswords({ ADMIN_PASSWORD: "123456" });
    expect(problems).toEqual([`ADMIN_PASSWORD: ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다 (현재 6자)`]);
  });

  it("경계: 12자는 통과, 11자는 거부한다", () => {
    expect(checkSeedPasswords({ ADMIN_PASSWORD: "abcdefghijkl" })).toEqual([]);
    expect(checkSeedPasswords({ ADMIN_PASSWORD: "abcdefghijk" })).toHaveLength(1);
  });

  it("같은 문자를 반복한 값은 길어도 거부한다", () => {
    expect(checkSeedPasswords({ ADMIN_PASSWORD: "a".repeat(20) })).toHaveLength(1);
    expect(checkSeedPasswords({ ADMIN_PASSWORD: "1212121212121212" })).toHaveLength(1);
  });

  it("앞뒤 공백이 있으면 거부한다", () => {
    expect(checkSeedPasswords({ ADMIN_PASSWORD: ` ${strong("a")}` })).toEqual(["ADMIN_PASSWORD: 앞뒤에 공백이 있습니다"]);
  });

  it("공백만 있는 값은 '없음'이 아니라 약한 값으로 거부한다", () => {
    const problems = checkSeedPasswords({ DEVMNG_PASSWORD: "    " });
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join()).toContain("DEVMNG_PASSWORD");
  });

  it("비어 있거나 없는 선택 값은 건너뛴다", () => {
    expect(checkSeedPasswords({ ADMIN_PASSWORD: strong("a"), DEVMNG_PASSWORD: "" })).toEqual([]);
    expect(checkSeedPasswords({ ADMIN_PASSWORD: strong("a"), DEVMNG_PASSWORD: undefined })).toEqual([]);
  });

  it("계정끼리 같은 비밀번호를 쓰면 거부한다 (서비스 비밀번호가 새면 관리자까지 뚫리므로)", () => {
    const same = strong("x");
    const problems = checkSeedPasswords({ ADMIN_PASSWORD: same, GUEST_PASSWORD: strong("g"), DEVMNG_PASSWORD: same });
    expect(problems).toEqual(["ADMIN_PASSWORD와 DEVMNG_PASSWORD가 같은 값입니다 (계정마다 달라야 합니다)"]);
  });

  it("72바이트를 넘으면 거부한다 (bcrypt 가 뒤를 잘라 비교하므로)", () => {
    expect(checkSeedPasswords({ ADMIN_PASSWORD: strong("a").padEnd(73, "Z") })).toHaveLength(1);
    expect(checkSeedPasswords({ ADMIN_PASSWORD: strong("a").padEnd(72, "Z") })).toEqual([]);
  });

  it("결과 문구에 비밀번호 값이 들어가지 않는다", () => {
    const secret = "tiny-secret";
    const text = passwordPolicyMessage(checkSeedPasswords({ ADMIN_PASSWORD: secret, GUEST_PASSWORD: secret }));
    expect(text).not.toContain(secret);
    expect(text).toContain("ADMIN_PASSWORD");
  });
});
