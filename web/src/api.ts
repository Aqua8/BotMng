export type Level = "info" | "warn" | "error";
export type Source = "out" | "error";

export interface LogEntry {
  id: number;
  source: Source;
  level: Level;
  tag: string | null;
  message: string;
  outcome: "success" | "failure" | "cancelled" | null; // Discord 명령 사용 로그([command])의 결과. 그 밖에는 null
  durationMs: number | null; // 명령 처리 시간(ms, 확인 버튼 대기 제외). 그 밖에는 null
  loggedAt: string;
}

export interface LogFilter {
  source?: Source;
  level?: Level;
  tag?: string;
  q?: string;
  from?: string;
  to?: string;
}

export interface Stats {
  total: number;
  last24h: Record<Level, number>;
  errors7d: number;
  lastLogAt: string | null;
  lastStartAt: string | null;
  byTag: { tag: string; count: number }[];
  hourly: { hour: string; info: number; warn: number; error: number }[];
}

export interface AccessLogEntry {
  id: number;
  loggedAt: string;
  username: string | null; // 게스트에게는 실패한 시도의 아이디가 null
  success: boolean;
  method: "password" | "guest" | "session"; // session = 저장된 로그인으로 다시 접속
  ip: string; // 게스트에게는 마지막 부분이 마스킹됨
  country: string | null;
  os: string;
  browser: string;
  device: string;
  userAgent: string | null; // 관리자에게만 내려옴
}

export interface AccessLogFilter {
  success?: boolean;
  method?: "password" | "guest" | "session";
  from?: string; // ISO, 이 시각 이후
  to?: string; // ISO, 이 시각 이전
}

export type SortOrder = "asc" | "desc";
export interface TableQuery {
  page: number;
  pageSize: number;
  sort?: string; // 지정하지 않으면 시각 내림차순
  order?: SortOrder;
}
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CommandStat {
  command: string;
  count: number;
  success: number;
  failure: number;
  cancelled: number;
  avgMs: number | null;
  maxMs: number | null;
}
export interface CommandStats {
  days: number;
  total: number;
  success: number;
  failure: number;
  cancelled: number;
  avgMs: number | null;
  byCommand: CommandStat[];
}

export interface SourceStatus {
  source: "out" | "error";
  fileSize: number | null;
  offset: number;
  lagBytes: number | null;
  fileMissing: boolean;
  lastPollAt: string | null;
  lastReadAt: string | null; // 마지막으로 새 로그를 읽은 시각. 서버 시작 후 새 로그가 없으면 null
  lastError: { kind: string; at: string } | null;
}
export interface Health {
  checkedAt: string;
  status: "ok" | "warn" | "error";
  issues: string[];
  server: { startedAt: string; uptimeSec: number };
  db: { ok: true; latencyMs: number; logCount: number; accessLogCount: number; sizeBytes: number } | { ok: false; error: string };
  collector: { sources: SourceStatus[] };
}

export interface AccessStats {
  days: number;
  total: number;
  success: number;
  failure: number;
  uniqueVisitors: number;
  byMethod: { password: number; guest: number; session: number };
  byCountry: { country: string; count: number; failure: number }[];
}

export interface Session {
  accessToken: string;
  username: string;
  role: "admin" | "guest";
}

const KEY = "botmng.session";

export const getSession = (): Session | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
};
export const saveSession = (s: Session) => localStorage.setItem(KEY, JSON.stringify(s));

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

export function clearSession() {
  localStorage.removeItem(KEY);
}

const authHeader = () => ({ Authorization: `Bearer ${getSession()?.accessToken ?? ""}` });

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: authHeader() });
  if (res.status === 401) {
    onUnauthorized();
    throw new Error("로그인이 필요합니다");
  }
  if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
  return res.json();
}

export async function login(username: string, password: string): Promise<Session> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(res.status === 401 ? "아이디 또는 비밀번호가 올바르지 않습니다" : `로그인 실패 (${res.status})`);
  return res.json();
}

export async function loginAsGuest(): Promise<Session> {
  const res = await fetch("/api/auth/guest", { method: "POST" });
  if (!res.ok) throw new Error(res.status === 429 ? "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요" : `게스트 로그인 실패 (${res.status})`);
  return res.json();
}

/**
 * 저장된 로그인으로 화면을 열었음을 서버에 알린다 (접속 로그에 "저장된 로그인"으로 기록, 같은 접속자는 1시간에 한 번만).
 * 토큰 검증도 겸한다: 만료됐으면 로그인 화면으로 돌아가고, 그 밖의 오류(횟수 제한, 네트워크 등)는 무시한다.
 */
export async function resumeSession(): Promise<void> {
  try {
    const res = await fetch("/api/auth/resume", { method: "POST", headers: authHeader() });
    if (res.status === 401) onUnauthorized();
  } catch {
    /* 기록 실패가 화면 사용을 막으면 안 된다 */
  }
}

const toQuery = (params: Record<string, string | number | boolean | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const fetchLogs = (filter: LogFilter, q: TableQuery) => get<Paged<LogEntry>>(`/logs${toQuery({ ...filter, ...q })}`);
export const fetchAccessLogs = (filter: AccessLogFilter, q: TableQuery) => get<Paged<AccessLogEntry>>(`/access-logs${toQuery({ ...filter, ...q })}`);
export const fetchTags = () => get<string[]>("/logs/tags");
export const fetchStats = () => get<Stats>("/stats");
export const fetchAccessStats = (days: number) => get<AccessStats>(`/stats/access?days=${days}`);
export const fetchHealth = () => get<Health>("/health");
export const fetchCommandStats = (days: number) => get<CommandStats>(`/stats/commands?days=${days}`);

/** SSE는 EventSource가 Authorization 헤더를 못 보내므로 fetch 스트림으로 직접 파싱한다. 반환값은 중단 함수. */
export function streamLogs(onLog: (e: LogEntry) => void, onState: (connected: boolean) => void): () => void {
  const ctrl = new AbortController();
  void (async () => {
    while (!ctrl.signal.aborted) {
      try {
        const res = await fetch("/api/logs/stream", { headers: authHeader(), signal: ctrl.signal });
        if (res.status === 401) return onUnauthorized();
        if (!res.ok || !res.body) throw new Error();
        onState(true);
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += value;
          let idx: number;
          while ((idx = buf.indexOf("\n\n")) !== -1) {
            const block = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            if (!block.includes("event: log")) continue;
            const data = block.split("\n").find((l) => l.startsWith("data: "));
            if (data) onLog(JSON.parse(data.slice(6)));
          }
        }
      } catch {
        if (ctrl.signal.aborted) return;
      }
      onState(false);
      await new Promise((r) => setTimeout(r, 3000)); // 끊기면 3초 뒤 재연결
    }
  })();
  return () => ctrl.abort();
}

const KST = { timeZone: "Asia/Seoul" } as const;
export const formatClock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { ...KST, hour12: false }); // 17:24:02
export const formatStamp = (iso: string) => new Date(iso).toLocaleString("sv-SE", KST); // 2026-10-06 17:24:02
export const dayKey = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", KST); // 2026-10-06 (날짜 구분용)
export const formatDay = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { ...KST, month: "long", day: "numeric", weekday: "long" });

export const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false }) : "-";
