import { useEffect, useState } from "react";
import { LogEntry, Stats, fetchLogs, fetchStats, formatClock, formatDay } from "./api";

const REFRESH_MS = 10_000;

// 봇의 예약 발송 시각(KST). 봇 스케줄을 바꾸면 여기도 같이 바꾼다.
const SCHEDULE: { hour: number; weekday?: number; label: string }[] = [
  { hour: 6, label: "06:00 오늘 일정" },
  { hour: 20, weekday: 0, label: "일 20:00 주간 요약" },
  { hour: 21, label: "21:00 내일 미리보기" },
];

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<LogEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = () =>
      Promise.all([fetchStats(), fetchLogs({ level: "error" }), fetchLogs({ level: "warn" })])
        .then(([s, errs, warns]) => {
          setStats(s);
          setAlerts([...errs.items, ...warns.items].sort((a, b) => b.id - a.id).slice(0, 5));
          setError("");
        })
        .catch((e: Error) => setError(e.message));
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  if (!stats) return <p className="muted">{error || "불러오는 중..."}</p>;

  const { info, warn, error: errors } = stats.last24h;
  const total = info + warn + errors;
  const lamp = errors > 0 ? "err" : warn > 0 ? "warn" : "ok";
  const maxTag = Math.max(1, ...stats.byTag.map((t) => t.count));

  return (
    <>
      <div className="page-head">
        <h1>대시보드</h1>
        <p className="lede">
          <span className={`lamp ${lamp}`} aria-hidden="true" />
          <span>
            최근 24시간 로그 <strong>{total}건</strong>
            {errors > 0 ? (
              <>
                , 에러 <strong>{errors}건</strong>
              </>
            ) : (
              ", 에러 없음"
            )}
            {warn > 0 && <>, 경고 {warn}건</>}
          </span>
        </p>
        <div className="facts">
          <span>
            마지막 로그 <b>{stats.lastLogAt ? formatClock(stats.lastLogAt) : "-"}</b>
          </span>
          <span>
            마지막 봇 시작{" "}
            <b>{stats.lastStartAt ? `${formatDay(stats.lastStartAt)} ${formatClock(stats.lastStartAt)}` : "-"}</b>
          </span>
          <span>
            최근 7일 에러 <b>{stats.errors7d}건</b>
          </span>
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}

      <section className="panel" aria-labelledby="clock-title">
        <div className="panel-head">
          <h2 id="clock-title">하루 시계</h2>
          <span className="muted">최근 24시간 · 한국 시간</span>
        </div>
        <DayClock hourly={stats.hourly} />
      </section>

      <div className="cols">
        <section className="panel">
          <div className="panel-head">
            <h2>태그별 로그</h2>
            <span className="muted">최근 24시간</span>
          </div>
          {stats.byTag.length === 0 ? (
            <p className="empty">아직 로그가 없습니다.</p>
          ) : (
            stats.byTag.map((t) => (
              <div className="tagrow" key={t.tag}>
                <span>[{t.tag}]</span>
                <div className="track">
                  <div className="fill" style={{ width: `${(t.count / maxTag) * 100}%` }} />
                </div>
                <span className="n">{t.count}</span>
              </div>
            ))
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>최근 경고와 에러</h2>
          </div>
          {alerts.length === 0 ? (
            <p className="empty">경고나 에러가 없습니다.</p>
          ) : (
            <div className="alerts">
              {alerts.map((a) => (
                <div className={`alert ${a.level}`} key={a.id}>
                  <span className="bar" />
                  <div>
                    <time dateTime={a.loggedAt}>
                      {formatDay(a.loggedAt)} {formatClock(a.loggedAt)} · {a.level === "error" ? "에러" : "경고"}
                    </time>
                    <pre>{a.message}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/** 최근 24시간을 1시간 칸 24개로 보여준다. 막대는 시간대별 로그 양, 마름모는 봇의 예약 발송, 점선은 지금. */
function DayClock({ hourly }: { hourly: Stats["hourly"] }) {
  const max = Math.max(1, ...hourly.map((h) => h.info + h.warn + h.error));
  const center = (i: number) => `${((i + 0.5) / hourly.length) * 100}%`;
  const marks = hourly.flatMap((h, i) => {
    const hour = Number(h.hour.slice(11, 13));
    const weekday = new Date(h.hour.slice(0, 10)).getUTCDay(); // 칸의 날짜(KST) 기준 요일
    return SCHEDULE.filter((s) => s.hour === hour && (s.weekday === undefined || s.weekday === weekday)).map((s) => ({ i, label: s.label }));
  });
  const nowPos = `${((hourly.length - 1 + new Date().getUTCMinutes() / 60) / hourly.length) * 100}%`; // KST 도 분 단위는 UTC 와 같다

  return (
    <div className="clock">
      <div className="clock-bars" role="img" aria-label="시간대별 로그 건수">
        {hourly.map((h, i) => {
          const sum = h.info + h.warn + h.error;
          return (
            <div key={h.hour} className="clock-col" title={`${h.hour.slice(5, 10)} ${h.hour.slice(11, 13)}시 — 로그 ${sum}건 (경고 ${h.warn}, 에러 ${h.error})`}>
              {sum === 0 ? (
                <span className="idle" />
              ) : (
                (["error", "warn", "info"] as const).map(
                  (level) => h[level] > 0 && <span key={level} className={`seg ${level}`} style={{ height: `max(3px, ${(h[level] / max) * 100}%)`, ["--i" as string]: i }} />,
                )
              )}
            </div>
          );
        })}
      </div>
      {marks.map((m) => (
        <div key={`line-${m.label}`} className="mline" style={{ left: center(m.i) }} aria-hidden="true" />
      ))}
      <div className="clock-now" style={{ left: nowPos }}>
        <span>지금</span>
      </div>
      <div className="clock-axis" aria-hidden="true">
        {hourly.map((h, i) => i % 3 === 0 && (
          <span key={h.hour} style={{ left: center(i) }}>
            {Number(h.hour.slice(11, 13))}시
          </span>
        ))}
      </div>
      <div className="clock-marks">
        {marks.map((m) => (
          <div key={m.label} className={`mark${m.i >= 16 ? " right" : ""}`} style={{ left: center(m.i) }}>
            <i />
            <span>{m.label}</span>
          </div>
        ))}
      </div>
      <div className="clock-legend">
        <span>
          <i style={{ background: "var(--accent)", opacity: 0.7 }} /> 정보
        </span>
        <span>
          <i style={{ background: "var(--warn)" }} /> 경고
        </span>
        <span>
          <i style={{ background: "var(--err)" }} /> 에러
        </span>
        <span>
          <i style={{ background: "var(--accent)", transform: "rotate(45deg)" }} /> 예약 발송
        </span>
      </div>
    </div>
  );
}
