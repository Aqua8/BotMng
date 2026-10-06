import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Type } from "class-transformer";
import { IsIn, IsOptional } from "class-validator";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { aggregateCommandStats } from "./command-stats";
import { LogEntry } from "./log-entry.entity";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const KST_OFFSET_MS = 9 * HOUR_MS; // DB가 KST로 저장되므로 시간 버킷도 KST 기준
const LEVELS = ["info", "warn", "error"] as const;

class CommandStatsQuery {
  @IsOptional() @Type(() => Number) @IsIn([1, 7, 30]) days: number = 7;
}

@UseGuards(JwtAuthGuard)
@Controller("stats")
export class StatsController {
  constructor(@InjectRepository(LogEntry) private readonly repo: Repository<LogEntry>) {}

  @Get()
  async stats() {
    const now = Date.now();
    const since24h = new Date(now - DAY_MS);
    const since7d = new Date(now - 7 * DAY_MS);

    const [total, last24h, errors7d, byTag, hourlyRows, latest, lastStart] = await Promise.all([
      this.repo.count(),
      this.countByLevel(since24h),
      this.errorCountSince(since7d),
      this.repo
        .createQueryBuilder("l")
        .select("l.tag", "tag")
        .addSelect("COUNT(*)", "count")
        .where("l.loggedAt >= :since AND l.tag IS NOT NULL", { since: since24h })
        .groupBy("l.tag")
        .orderBy("count", "DESC")
        .getRawMany<{ tag: string; count: string }>(),
      this.repo
        .createQueryBuilder("l")
        .select("DATE_FORMAT(l.loggedAt, '%Y-%m-%dT%H:00:00+09:00')", "hour")
        .addSelect("l.level", "level")
        .addSelect("COUNT(*)", "count")
        .where("l.loggedAt >= :since", { since: since24h })
        .groupBy("hour")
        .addGroupBy("l.level")
        .getRawMany<{ hour: string; level: (typeof LEVELS)[number]; count: string }>(),
      this.repo.findOne({ where: {}, order: { id: "DESC" } }),
      this.repo
        .createQueryBuilder("l")
        .where("l.tag = 'scheduler' AND l.message LIKE '%시작됨%'")
        .orderBy("l.id", "DESC")
        .getOne(),
    ]);

    return {
      total,
      last24h,
      errors7d,
      lastLogAt: latest?.loggedAt ?? null,
      lastStartAt: lastStart?.loggedAt ?? null,
      byTag: byTag.map((r) => ({ tag: r.tag, count: Number(r.count) })),
      hourly: this.fillHours(now, hourlyRows),
    };
  }

  /** Discord 명령 사용 통계. 입력 내용은 로그에 없으므로 게스트에게도 보여도 된다. */
  @Get("commands")
  async commands(@Query() query: CommandStatsQuery) {
    const since = new Date(Date.now() - query.days * DAY_MS);
    const rows = await this.repo
      .createQueryBuilder("l")
      .select(["l.message", "l.outcome", "l.durationMs"])
      .where("l.tag = 'command' AND l.loggedAt >= :since", { since })
      .getMany();
    return { days: query.days, ...aggregateCommandStats(rows) };
  }

  private async countByLevel(since: Date) {
    const rows = await this.repo
      .createQueryBuilder("l")
      .select("l.level", "level")
      .addSelect("COUNT(*)", "count")
      .where("l.loggedAt >= :since", { since })
      .groupBy("l.level")
      .getRawMany<{ level: (typeof LEVELS)[number]; count: string }>();
    const result = { info: 0, warn: 0, error: 0 };
    for (const r of rows) result[r.level] = Number(r.count);
    return result;
  }

  private errorCountSince(since: Date) {
    return this.repo
      .createQueryBuilder("l")
      .where("l.level = 'error' AND l.loggedAt >= :since", { since })
      .getCount();
  }

  /** 최근 24시간을 1시간 단위(KST)로 채운다 (로그 없는 시간도 0으로 포함). */
  private fillHours(now: number, rows: { hour: string; level: (typeof LEVELS)[number]; count: string }[]) {
    const current = Math.floor(now / HOUR_MS) * HOUR_MS;
    const buckets = new Map<string, { hour: string; info: number; warn: number; error: number }>();
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(current - i * HOUR_MS + KST_OFFSET_MS).toISOString().slice(0, 13) + ":00:00+09:00";
      buckets.set(hour, { hour, info: 0, warn: 0, error: 0 });
    }
    for (const r of rows) {
      const bucket = buckets.get(r.hour);
      if (bucket) bucket[r.level] = Number(r.count);
    }
    return [...buckets.values()];
  }
}
