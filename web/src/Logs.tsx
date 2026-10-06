import { useCallback, useEffect, useRef, useState } from "react";
import { Level, LogEntry, LogFilter, Source, fetchLogs, fetchTags, formatTime, streamLogs } from "./api";

const MAX_ROWS = 2000; // 라이브로 쌓이는 행이 무한정 늘지 않도록 상한을 둔다
const toIso = (local: string) => (local ? new Date(`${local}:00+09:00`).toISOString() : undefined); // 입력값은 KST로 해석

function matches(e: LogEntry, f: LogFilter) {
  return (
    (!f.source || e.source === f.source) &&
    (!f.level || e.level === f.level) &&
    (!f.tag || e.tag === f.tag) &&
    (!f.q || e.message.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.from || e.loggedAt >= f.from) &&
    (!f.to || e.loggedAt <= f.to)
  );
}

export function Logs() {
  const [source, setSource] = useState<Source | "">("");
  const [level, setLevel] = useState<Level | "">("");
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [rows, setRows] = useState<LogEntry[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [live, setLive] = useState(true);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filter: LogFilter = {
    source: source || undefined,
    level: level || undefined,
    tag: tag || undefined,
    q: q || undefined,
    from: toIso(from),
    to: toIso(to),
  };
  const filterKey = JSON.stringify(filter);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  useEffect(() => {
    fetchTags().then(setTags).catch(() => {});
  }, []);

  // 필터가 바뀌면 (검색어는 입력이 멈춘 뒤) 처음부터 다시 조회한다.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      fetchLogs(filterRef.current)
        .then((r) => {
          if (cancelled) return;
          setRows(r.items);
          setCursor(r.nextCursor);
          setError("");
        })
        .catch((e: Error) => !cancelled && setError(e.message))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [filterKey]);

  const onLive = useCallback((e: LogEntry) => {
    if (!matches(e, filterRef.current)) return;
    setRows((prev) => (prev.some((r) => r.id === e.id) ? prev : [e, ...prev].slice(0, MAX_ROWS)));
  }, []);

  useEffect(() => {
    if (!live) {
      setConnected(false);
      return;
    }
    return streamLogs(onLive, setConnected);
  }, [live, onLive]);

  const loadMore = async () => {
    if (cursor === null) return;
    setLoading(true);
    try {
      const r = await fetchLogs(filter, cursor);
      setRows((prev) => [...prev, ...r.items]);
      setCursor(r.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="filters card">
        <select value={source} onChange={(e) => setSource(e.target.value as Source | "")}>
          <option value="">전체 파일</option>
          <option value="out">out.log</option>
          <option value="error">error.log</option>
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value as Level | "")}>
          <option value="">전체 레벨</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
        </select>
        <select value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">전체 태그</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              [{t}]
            </option>
          ))}
        </select>
        <input className="grow" placeholder="메시지 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <label>
          시작(KST) <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          종료(KST) <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="live">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          실시간 <span className={`dot${live && connected ? " on" : ""}`} title={connected ? "연결됨" : "연결 안 됨"} />
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card list">
        {rows.length === 0 && !loading && <p className="muted">로그가 없습니다</p>}
        {rows.map((r) => (
          <div key={r.id} className={`row ${r.level}`}>
            <span className="time">{formatTime(r.loggedAt)}</span>
            <span className={`badge ${r.level}`}>{r.level}</span>
            <span className="src">{r.source}</span>
            <pre>{r.message}</pre>
          </div>
        ))}
        {cursor !== null && (
          <button onClick={loadMore} disabled={loading}>
            더 보기
          </button>
        )}
        {loading && <p className="muted">불러오는 중...</p>}
      </div>
    </>
  );
}
