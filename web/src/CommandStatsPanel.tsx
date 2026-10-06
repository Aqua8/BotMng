import { Table } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { CommandStats, fetchCommandStats } from "./api";
import { Panel } from "./components/Panel";
import { PeriodSelect } from "./components/PeriodSelect";
import { formatDuration } from "./lib/format-duration";

const REFRESH_MS = 30_000;

/** Discord 명령 사용 통계: 기간을 고르면 한 줄 요약과 명령별 횟수·결과·처리시간을 보여준다. */
export function CommandStatsPanel() {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<CommandStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchCommandStats(days)
        .then((s) => !cancelled && (setStats(s), setError("")))
        .catch((e: Error) => !cancelled && setError(e.message));
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [days]);

  return (
    <Panel id="commands" title="명령 사용" aside={<PeriodSelect days={days} onChange={setDays} />}>
      {error && <p className="error-text">{error}</p>}
      {!stats ? (
        <p className="empty">불러오는 중...</p>
      ) : stats.total === 0 ? (
        <p className="empty">이 기간에 사용한 명령이 없습니다.</p>
      ) : (
        <>
          <p className="cmd-summary">
            명령 <strong>{stats.total}회</strong> 사용
            {stats.failure > 0 ? (
              <>
                , 실패 <strong>{stats.failure}회</strong> ({Math.round((stats.failure / stats.total) * 100)}%)
              </>
            ) : (
              ", 실패 없음"
            )}
            {stats.cancelled > 0 && <>, 취소 {stats.cancelled}회</>}
            {stats.avgMs !== null && <> · 평균 처리시간 {formatDuration(stats.avgMs)}</>}
          </p>
          <div className="table-wrap">
            <Table.Root variant="ghost" size="1" style={{ minWidth: 520 }}>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>명령</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>횟수</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>성공</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>실패</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>취소</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>평균 처리시간</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>최대</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {stats.byCommand.map((c) => (
                  <Table.Row key={c.command}>
                    <Table.Cell className="mono nowrap">{c.command}</Table.Cell>
                    <Table.Cell>{c.count}</Table.Cell>
                    <Table.Cell>{c.success}</Table.Cell>
                    <Table.Cell className={c.failure > 0 ? "cmd-failed" : "muted"}>{c.failure}</Table.Cell>
                    <Table.Cell className={c.cancelled > 0 ? undefined : "muted"}>{c.cancelled}</Table.Cell>
                    <Table.Cell className="nowrap">{c.avgMs === null ? "-" : formatDuration(c.avgMs)}</Table.Cell>
                    <Table.Cell className="nowrap">{c.maxMs === null ? "-" : formatDuration(c.maxMs)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </div>
        </>
      )}
    </Panel>
  );
}
