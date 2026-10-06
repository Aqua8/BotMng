import { useEffect, useState } from "react";
import { AccessStats, fetchAccessStats } from "./api";
import { Panel } from "./components/Panel";
import { PeriodSelect } from "./components/PeriodSelect";

const REFRESH_MS = 30_000;
const REGIONS = new Intl.DisplayNames(["ko"], { type: "region" });
const countryName = (code: string) => {
  if (code === "??") return "알 수 없음";
  try {
    return REGIONS.of(code) ?? code;
  } catch {
    return code;
  }
};

/** 접속 요약: 접속 수, 성공/실패, 고유 접속자, 로그인 방식별, 국가별. IP 같은 개인 식별 값은 개수로만 보여준다. */
export function AccessStatsPanel() {
  const [days, setDays] = useState(1);
  const [stats, setStats] = useState<AccessStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchAccessStats(days)
        .then((s) => !cancelled && (setStats(s), setError("")))
        .catch((e: Error) => !cancelled && setError(e.message));
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [days]);

  const maxCountry = Math.max(1, ...(stats?.byCountry.map((c) => c.count) ?? []));

  return (
    <Panel id="access-stats" title="접속 요약" aside={<PeriodSelect days={days} onChange={setDays} />}>
      {error && <p className="error-text">{error}</p>}
      {!stats ? (
        <p className="empty">불러오는 중...</p>
      ) : stats.total === 0 ? (
        <p className="empty">이 기간에 접속 기록이 없습니다.</p>
      ) : (
        <>
          <p className="cmd-summary">
            접속 <strong>{stats.total}회</strong>
            {stats.failure > 0 ? (
              <>
                , 실패 <strong className="cmd-failed">{stats.failure}회</strong>
              </>
            ) : (
              ", 실패 없음"
            )}{" "}
            · 고유 접속자 {stats.uniqueVisitors}명
          </p>
          <p className="cmd-summary">
            비밀번호 {stats.byMethod.password}회 · 게스트 버튼 {stats.byMethod.guest}회 · 저장된 로그인 {stats.byMethod.session}회
          </p>
          <div className="access-countries">
            {stats.byCountry.map((c) => (
              <div className="tagrow" key={c.country}>
                <span>{countryName(c.country)}</span>
                <div className="track">
                  <div className="fill" style={{ width: `${(c.count / maxCountry) * 100}%` }} />
                </div>
                <span className="n">
                  {c.count}
                  {c.failure > 0 && <span className="cmd-failed"> (실패 {c.failure})</span>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
