/**
 * 계정 단위 로그인 잠금. Nest 에 의존하지 않는 순수 클래스라 단위 테스트가 쉽다.
 *
 * IP 당 횟수 제한(ThrottlerGuard)은 여러 IP 로 나눠 시도하는 공격을 막지 못한다. 그래서 같은 계정에서 실패가
 * 짧은 시간에 쌓이면 접속 IP 와 상관없이 그 계정의 로그인을 잠시 막는다. 존재하지 않는 아이디도 같은 방식으로
 * 세므로 잠금 여부로 계정이 있는지 알 수 없다.
 *
 * 한계: 메모리에만 저장하므로 서버를 재시작하면 초기화되고, 공격자가 일부러 실패를 쌓아 정상 사용자를 잠시
 * 잠글 수 있다(그래서 잠금은 짧게, 기준은 느슨하게 둔다).
 */
export interface LockoutPolicy {
  /** 이 기간(ms) 안에 실패가 maxFailures 번 쌓이면 잠근다 */
  windowMs: number;
  maxFailures: number;
  /** 잠그는 기간(ms) */
  lockMs: number;
  /** 추적하는 계정 수 상한. 넘으면 가장 오래된 것부터 버린다(임의의 아이디로 메모리를 채우는 공격 방지) */
  maxKeys: number;
}

export const DEFAULT_LOCKOUT: LockoutPolicy = { windowMs: 15 * 60_000, maxFailures: 10, lockMs: 15 * 60_000, maxKeys: 10_000 };

interface Entry {
  failures: number;
  windowStart: number;
  lockedUntil: number;
}

export class LoginLockout {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly policy: LockoutPolicy = DEFAULT_LOCKOUT) {}

  /** 아이디 대소문자와 앞뒤 공백 차이로 잠금을 피하지 못하게 맞춘다 */
  static key(scope: string, name: string): string {
    return `${scope}:${name.trim().toLowerCase()}`;
  }

  /** 잠겨 있으면 남은 시간(ms), 아니면 0 */
  remainingLockMs(key: string, now: number = Date.now()): number {
    const e = this.entries.get(key);
    return e && e.lockedUntil > now ? e.lockedUntil - now : 0;
  }

  /** 인증에 실패했음을 기록한다. 이미 잠겨 있으면 기간을 늘리지 않는다. */
  recordFailure(key: string, now: number = Date.now()): void {
    const e = this.entries.get(key) ?? { failures: 0, windowStart: now, lockedUntil: 0 };
    if (e.lockedUntil > now) return;
    if (now - e.windowStart > this.policy.windowMs) {
      e.failures = 0;
      e.windowStart = now;
    }
    e.failures++;
    if (e.failures >= this.policy.maxFailures) {
      e.lockedUntil = now + this.policy.lockMs;
      e.failures = 0;
      e.windowStart = now;
    }
    this.entries.delete(key); // 다시 넣어서 "가장 최근에 쓴" 순서로 둔다
    this.entries.set(key, e);
    while (this.entries.size > this.policy.maxKeys) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  /** 인증에 성공하면 그 계정의 실패 기록을 지운다. */
  recordSuccess(key: string): void {
    this.entries.delete(key);
  }
}
