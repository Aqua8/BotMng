import { useEffect, useState } from "react";
import { Stats, fetchStats, formatTime } from "./api";

const REFRESH_MS = 10_000;

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = () =>
      fetchStats()
        .then((s) => {
          setStats(s);
          setError("");
        })
        .catch((e: Error) => setError(e.message));
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  if (!stats) return <p className="muted">{error || "불러오는 중..."}</p>;

  return (
    <>
      {error && <p className="error-text">{error}</p>}
      <div className="tiles">
        <Tile label="전체 로그" value={stats.total} />
        <Tile label="24시간 에러" value={stats.last24h.error} danger={stats.last24h.error > 0} />
        <Tile label="24시간 경고" value={stats.last24h.warn} warn={stats.last24h.warn > 0} />
        <Tile label="7일 에러" value={stats.errors7d} danger={stats.errors7d > 0} />
      </div>
      <div className="tiles">
        <Tile label="마지막 로그" value={formatTime(stats.lastLogAt)} small />
        <Tile label="마지막 봇 시작" value={formatTime(stats.lastStartAt)} small />
      </div>

      <section className="card">
        <h2>시간대별 로그 (최근 24시간, KST)</h2>
        <HourlyChart data={stats.hourly} />
      </section>

      <section className="card">
        <h2>태그별 건수 (최근 24시간)</h2>
        {stats.byTag.length === 0 ? (
          <p className="muted">데이터가 없습니다</p>
        ) : (
          <table>
            <tbody>
              {stats.byTag.map((t) => (
                <tr key={t.tag}>
                  <td>[{t.tag}]</td>
                  <td className="num">{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function Tile(p: { label: string; value: number | string; danger?: boolean; warn?: boolean; small?: boolean }) {
  return (
    <div className={`tile card${p.danger ? " danger" : ""}${p.warn ? " warn" : ""}`}>
      <div className="muted">{p.label}</div>
      <div className={p.small ? "value small" : "value"}>{p.value}</div>
    </div>
  );
}

function HourlyChart({ data }: { data: Stats["hourly"] }) {
  const W = 720;
  const H = 160;
  const bar = W / data.length;
  const max = Math.max(1, ...data.map((d) => d.info + d.warn + d.error));
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="chart" role="img" aria-label="시간대별 로그 건수">
      {data.map((d, i) => {
        let y = H;
        const segs = (["info", "warn", "error"] as const).map((level) => {
          const h = (d[level] / max) * H;
          y -= h;
          return h > 0 ? <rect key={level} className={level} x={i * bar + 2} y={y} width={bar - 4} height={h} /> : null;
        });
        const hour = d.hour.slice(11, 13);
        return (
          <g key={d.hour}>
            <title>{`${d.hour.slice(5, 13).replace("T", " ")}시 — info ${d.info}, warn ${d.warn}, error ${d.error}`}</title>
            {segs}
            {i % 3 === 0 && (
              <text x={i * bar + bar / 2} y={H + 14} textAnchor="middle">
                {hour}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
