import type { CommandOutcome } from "./log-parser";

export interface CommandRow {
  message: string;
  outcome: CommandOutcome | null;
  durationMs: number | null;
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
  total: number;
  success: number;
  failure: number;
  cancelled: number;
  avgMs: number | null;
  byCommand: CommandStat[];
}

/** "[command] /일정추가: 사유" 에서 "/일정추가"를. /비서는 해석된 동작까지("/비서(일정삭제)") 이름에 포함된다. */
export function commandNameOf(message: string): string | null {
  return /^\[command\] ([^\s:]+)/.exec(message)?.[1] ?? null;
}

const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);

/**
 * 명령 사용 로그 행들을 전체와 명령별로 집계한다. 결과(outcome)가 없는 줄(형식이 다른 [command] 줄)과 명령 이름이 없는 줄은 센다 않는다.
 * 평균·최대 처리시간은 처리시간이 있는 행만으로 계산한다. 명령은 횟수 많은 순, 같으면 이름순.
 */
export function aggregateCommandStats(rows: CommandRow[]): CommandStats {
  const groups = new Map<string, { success: number; failure: number; cancelled: number; times: number[] }>();
  const allTimes: number[] = [];
  const total = { success: 0, failure: 0, cancelled: 0 };

  for (const r of rows) {
    const command = commandNameOf(r.message);
    if (!command || !r.outcome) continue;
    const g = groups.get(command) ?? { success: 0, failure: 0, cancelled: 0, times: [] };
    g[r.outcome]++;
    total[r.outcome]++;
    if (r.durationMs !== null) {
      g.times.push(r.durationMs);
      allTimes.push(r.durationMs);
    }
    groups.set(command, g);
  }

  const byCommand = [...groups].map(([command, g]) => ({
    command,
    count: g.success + g.failure + g.cancelled,
    success: g.success,
    failure: g.failure,
    cancelled: g.cancelled,
    avgMs: average(g.times),
    maxMs: g.times.length ? Math.max(...g.times) : null,
  }));
  byCommand.sort((a, b) => b.count - a.count || a.command.localeCompare(b.command));

  return { total: total.success + total.failure + total.cancelled, ...total, avgMs: average(allTimes), byCommand };
}
