import { DEFAULT_LOCKOUT, LoginLockout } from "./login-lockout";

const policy = { windowMs: 1000, maxFailures: 3, lockMs: 5000, maxKeys: 3 };

describe("LoginLockout", () => {
  it("실패가 기준에 못 미치면 잠그지 않는다", () => {
    const l = new LoginLockout(policy);
    l.recordFailure("login:admin", 0);
    l.recordFailure("login:admin", 10);
    expect(l.remainingLockMs("login:admin", 20)).toBe(0);
  });

  it("기간 안에 기준만큼 실패하면 잠그고 남은 시간을 알려 준다", () => {
    const l = new LoginLockout(policy);
    for (const t of [0, 10, 20]) l.recordFailure("login:admin", t);
    expect(l.remainingLockMs("login:admin", 30)).toBe(4990);
    expect(l.remainingLockMs("login:admin", 5020)).toBe(0); // 잠금 기간이 지나면 풀린다
  });

  it("실패 사이가 기간보다 길면 처음부터 다시 센다", () => {
    const l = new LoginLockout(policy);
    l.recordFailure("login:admin", 0);
    l.recordFailure("login:admin", 10);
    l.recordFailure("login:admin", 2000); // 기간(1000ms) 밖이라 1번째 실패로 다시 시작
    expect(l.remainingLockMs("login:admin", 2010)).toBe(0);
    l.recordFailure("login:admin", 2020);
    l.recordFailure("login:admin", 2030);
    expect(l.remainingLockMs("login:admin", 2040)).toBeGreaterThan(0);
  });

  it("성공하면 실패 기록을 지운다", () => {
    const l = new LoginLockout(policy);
    l.recordFailure("login:admin", 0);
    l.recordFailure("login:admin", 10);
    l.recordSuccess("login:admin");
    l.recordFailure("login:admin", 20);
    l.recordFailure("login:admin", 30);
    expect(l.remainingLockMs("login:admin", 40)).toBe(0); // 성공 전 2번은 사라졌으므로 아직 2번째
  });

  it("잠긴 동안의 시도는 잠금 기간을 늘리지 않는다", () => {
    const l = new LoginLockout(policy);
    for (const t of [0, 10, 20]) l.recordFailure("login:admin", t);
    l.recordFailure("login:admin", 4000);
    expect(l.remainingLockMs("login:admin", 5025)).toBe(0); // 20 + 5000 에서 풀린다
  });

  it("계정마다 따로 센다", () => {
    const l = new LoginLockout(policy);
    for (const t of [0, 10, 20]) l.recordFailure("login:admin", t);
    expect(l.remainingLockMs("login:guest", 30)).toBe(0);
    expect(l.remainingLockMs("service:devmng", 30)).toBe(0);
  });

  it("아이디의 대소문자·공백 차이로 잠금을 피하지 못한다", () => {
    expect(LoginLockout.key("login", " Admin ")).toBe("login:admin");
    expect(LoginLockout.key("login", "ADMIN")).toBe(LoginLockout.key("login", "admin"));
  });

  it("없는 아이디도 똑같이 세어서 잠금 여부로 계정 존재를 알 수 없다", () => {
    const l = new LoginLockout(policy);
    for (const t of [0, 10, 20]) l.recordFailure(LoginLockout.key("login", "nobody"), t);
    expect(l.remainingLockMs(LoginLockout.key("login", "nobody"), 30)).toBeGreaterThan(0);
  });

  it("추적하는 계정 수가 상한을 넘으면 가장 오래된 것부터 버린다", () => {
    const l = new LoginLockout(policy); // maxKeys 3
    for (const t of [0, 1, 2]) l.recordFailure("login:a", t);
    expect(l.remainingLockMs("login:a", 3)).toBeGreaterThan(0);
    l.recordFailure("login:b", 4);
    l.recordFailure("login:c", 5);
    l.recordFailure("login:d", 6); // 4번째 → 가장 오래된 login:a 가 밀려남
    expect(l.remainingLockMs("login:a", 7)).toBe(0);
  });

  it("기본 정책: 15분 안에 10번 실패하면 15분 잠금", () => {
    expect(DEFAULT_LOCKOUT).toMatchObject({ windowMs: 900_000, maxFailures: 10, lockMs: 900_000 });
  });
});
