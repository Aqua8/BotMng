/** 시스템 상태 판정 로직. Nest 에 의존하지 않는 순수 함수라 단위 테스트가 쉽다. */

export type HealthLevel = "ok" | "warn" | "error";

export interface SourceStatus {
  source: "out" | "error";
  fileSize: number | null;
  offset: number;
  /** 아직 읽지 못한 바이트. 파일 크기를 모르면 null */
  lagBytes: number | null;
  fileMissing: boolean;
  lastPollAt: Date | null;
  /** 마지막으로 새 로그를 읽어 저장한 시각 (봇이 조용하면 오래될 수 있어 정상) */
  lastReadAt: Date | null;
  lastError: { kind: string; at: Date } | null;
}

const STALL_MS = 10_000; // 1초마다 확인하는 수집기가 이 시간 동안 확인하지 못했으면 멈춘 것
const LAG_WARN_BYTES = 64 * 1024; // 쓰는 중인 줄 정도(작은 지연)는 정상, 이보다 크면 밀리고 있는 것
const ERROR_RECENT_MS = 60_000;

export const lagBytes = (fileSize: number | null, offset: number): number | null => (fileSize === null ? null : Math.max(0, fileSize - offset));

/**
 * 수집 중 발생한 오류를 종류 이름으로만 바꾼다. 오류 메시지에는 로컬 경로(계정명 포함)가 섞일 수 있고
 * 이 값은 게스트에게도 보이므로 메시지는 노출하지 않는다.
 */
export function describeCollectorError(err: unknown): string {
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === "string") {
    if (code === "ENOENT") return "로그 파일 없음";
    if (code === "EACCES" || code === "EPERM") return "로그 파일 권한 없음";
    if (code === "ECONNREFUSED" || code === "PROTOCOL_CONNECTION_LOST" || code === "ETIMEDOUT" || code === "ECONNRESET") return "DB 연결 오류";
    if (code.startsWith("ER_")) return "DB 오류";
  }
  return "수집 오류";
}

export function evaluateHealth(input: { db: { ok: boolean }; sources: SourceStatus[] }, now: Date = new Date()): { status: HealthLevel; issues: string[] } {
  const errors: string[] = [];
  const warns: string[] = [];

  if (!input.db.ok) errors.push("DB에 연결할 수 없습니다");

  for (const s of input.sources) {
    const name = `${s.source}.log`;
    if (s.lastPollAt && now.getTime() - s.lastPollAt.getTime() > STALL_MS) errors.push(`수집기가 멈춘 것 같습니다 (${name})`);
    if (s.fileMissing) warns.push(`로그 파일을 찾을 수 없습니다 (${name})`);
    if (s.lagBytes !== null && s.lagBytes > LAG_WARN_BYTES) warns.push(`수집이 밀리고 있습니다 (${name})`);
    if (s.lastError && now.getTime() - s.lastError.at.getTime() <= ERROR_RECENT_MS) warns.push(`최근 수집 오류: ${s.lastError.kind} (${name})`);
  }

  return { status: errors.length ? "error" : warns.length ? "warn" : "ok", issues: [...errors, ...warns] };
}
