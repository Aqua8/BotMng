import { useEffect, useState } from "react";
import { Health, SourceStatus, fetchHealth, formatClock } from "./api";
import { Panel } from "./components/Panel";
import { StatusLamp } from "./components/StatusLamp";
import { formatAgo, formatBytes, formatUptime } from "./lib/format-health";

const REFRESH_MS = 10_000;
const RECENT_ERROR_MS = 60_000; // 서버의 판정 기준과 같다: 최근 1분 안의 오류만 경고색
const LEVEL = { ok: { lamp: "ok", text: "정상" }, warn: { lamp: "warn", text: "주의" }, error: { lamp: "err", text: "문제" } } as const;

/** DB와 로그 수집기의 상태. 문제가 있으면 어떤 문제인지 맨 위에 보여준다. */
export function HealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchHealth()
        .then((h) => !cancelled && (setHealth(h), setError("")))
        .catch((e: Error) => !cancelled && setError(e.message));
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const level = health ? LEVEL[health.status] : null;
  const aside = level && (
    <span className="health-state">
      <StatusLamp status={level.lamp} /> {level.text}
    </span>
  );

  return (
    <Panel id="health" title="시스템 상태" aside={aside}>
      {error && <p className="error-text">{error}</p>}
      {!health ? (
        <p className="empty">불러오는 중...</p>
      ) : (
        <>
          {health.issues.length > 0 && (
            <ul className={`health-issues ${health.status}`}>
              {health.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
          <div className="health-grid">
            <section>
              <h3>DB</h3>
              {health.db.ok ? (
                <dl className="kv">
                  <dt>상태</dt>
                  <dd>연결됨 ({health.db.latencyMs}ms)</dd>
                  <dt>로그</dt>
                  <dd>{health.db.logCount.toLocaleString("ko-KR")}건</dd>
                  <dt>접속 로그</dt>
                  <dd>{health.db.accessLogCount.toLocaleString("ko-KR")}건</dd>
                  <dt>크기</dt>
                  <dd>{formatBytes(health.db.sizeBytes)}</dd>
                </dl>
              ) : (
                <dl className="kv">
                  <dt>상태</dt>
                  <dd className="cmd-failed">연결 안 됨 ({health.db.error})</dd>
                </dl>
              )}
            </section>
            {health.collector.sources.map((s) => (
              <SourceCard key={s.source} s={s} />
            ))}
          </div>
          <p className="muted health-foot">
            서버 가동 {formatUptime(health.server.uptimeSec)} · {formatClock(health.checkedAt)} 확인
          </p>
        </>
      )}
    </Panel>
  );
}

function SourceCard({ s }: { s: SourceStatus }) {
  const lag = s.lagBytes === null ? "알 수 없음" : s.lagBytes === 0 ? "지연 없음" : `${formatBytes(s.lagBytes)} 지연`;
  return (
    <section>
      <h3>수집기 · {s.source}.log</h3>
      <dl className="kv">
        <dt>읽은 위치</dt>
        <dd>
          {s.fileMissing ? <span className="cmd-failed">로그 파일 없음</span> : `${formatBytes(s.offset)} / ${s.fileSize === null ? "-" : formatBytes(s.fileSize)} (${lag})`}
        </dd>
        <dt>마지막 확인</dt>
        <dd>{s.lastPollAt ? formatAgo(s.lastPollAt) : "-"}</dd>
        <dt>새 로그</dt>
        <dd>{s.lastReadAt ? formatAgo(s.lastReadAt) : <span className="muted">서버 시작 후 없음</span>}</dd>
        {s.lastError && (
          <>
            <dt>마지막 오류</dt>
            <dd className={Date.now() - new Date(s.lastError.at).getTime() <= RECENT_ERROR_MS ? "cmd-failed" : "muted"}>
              {s.lastError.kind} ({formatAgo(s.lastError.at)})
            </dd>
          </>
        )}
      </dl>
    </section>
  );
}
