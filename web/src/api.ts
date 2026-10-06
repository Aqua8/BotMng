export type Level = "info" | "warn" | "error";
export type Source = "out" | "error";

export interface LogEntry {
  id: number;
  source: Source;
  level: Level;
  tag: string | null;
  message: string;
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

const toQuery = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const fetchLogs = (filter: LogFilter, beforeId?: number) =>
  get<{ items: LogEntry[]; nextCursor: number | null }>(`/logs${toQuery({ ...filter, beforeId, limit: 100 })}`);
export const fetchTags = () => get<string[]>("/logs/tags");
export const fetchStats = () => get<Stats>("/stats");

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

export const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false }) : "-";
