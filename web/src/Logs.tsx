import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Level, LogEntry, LogFilter, Source, dayKey, fetchLogs, fetchTags, formatClock, formatDay, streamLogs } from "./api";

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

/** "[daily] 발송 완료" 처럼 앞의 [태그]를 포인트색으로 보여준다. */
function Message({ text }: { text: string }) {
  const m = /^(\[[^\]]+\])([\s\S]*)$/.exec(text);
  return <pre className="msg">{m ? <><span className="tag">{m[1]}</span>{m[2]}</> : text}</pre>;
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
  const [fresh, setFresh] = useState<Set<number>>(new Set());
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
          setFresh(new Set());
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
    setFresh((prev) => new Set(prev).add(e.id));
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
      <div className="page-head">
        <h1>로그</h1>
        <p className="lede">봇이 남긴 out.log와 error.log를 최신순으로 보여줍니다.</p>
      </div>

      <div className="toolbar">
        <select aria-label="로그 파일" value={source} onChange={(e) => setSource(e.target.value as Source | "")}>
          <option value="">전체 파일</option>
          <option value="out">out.log</option>
          <option value="error">error.log</option>
        </select>
        <select aria-label="레벨" value={level} onChange={(e) => setLevel(e.target.value as Level | "")}>
          <option value="">전체 레벨</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
        </select>
        <select aria-label="태그" value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">전체 태그</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              [{t}]
            </option>
          ))}
        </select>
        <input className="grow" aria-label="메시지 검색" placeholder="메시지 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="switch" title={connected ? "연결됨" : live ? "연결 중" : "꺼짐"}>
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          <span className={`lamp${live && connected ? " ok" : ""}`} aria-hidden="true" />
          실시간
        </label>
      </div>
      <div className="toolbar dates">
        <label>
          시작(KST) <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          종료(KST) <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="stream">
        {rows.length === 0 && !loading && <p className="empty" style={{ padding: "14px 16px" }}>조건에 맞는 로그가 없습니다.</p>}
        {rows.map((r, i) => (
          <Fragment key={r.id}>
            {(i === 0 || dayKey(rows[i - 1].loggedAt) !== dayKey(r.loggedAt)) && <div className="daysep">{formatDay(r.loggedAt)}</div>}
            <div className={`line ${r.level}${fresh.has(r.id) ? " fresh" : ""}`}>
              <span className="bar" />
              <time className="t" dateTime={r.loggedAt}>
                {formatClock(r.loggedAt)}
              </time>
              <span className="src">{r.source}</span>
              <Message text={r.message} />
            </div>
          </Fragment>
        ))}
        {(cursor !== null || loading) && (
          <div className="stream-foot">
            {loading ? (
              <span className="muted">불러오는 중...</span>
            ) : (
              <button onClick={loadMore}>더 보기</button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
