import { Controller, Get, MessageEvent, Query, Sse, UseGuards } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Observable, interval, map, merge, mergeMap, from as rxFrom } from "rxjs";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CollectorService } from "./collector.service";
import { LogEntry } from "./log-entry.entity";

class ListLogsQuery {
  @IsOptional() @IsIn(["out", "error"]) source?: "out" | "error";
  @IsOptional() @IsIn(["info", "warn", "error"]) level?: "info" | "warn" | "error";
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() beforeId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit: number = 100;
}

const KEEPALIVE_MS = 25_000;

@UseGuards(JwtAuthGuard)
@Controller("logs")
export class LogsController {
  constructor(
    @InjectRepository(LogEntry) private readonly repo: Repository<LogEntry>,
    private readonly collector: CollectorService,
  ) {}

  /** 최신순 목록. 다음 페이지는 응답의 nextCursor를 beforeId로 넘긴다. */
  @Get()
  async list(@Query() query: ListLogsQuery) {
    const qb = this.repo.createQueryBuilder("l").orderBy("l.id", "DESC").limit(query.limit + 1);
    if (query.source) qb.andWhere("l.source = :source", { source: query.source });
    if (query.level) qb.andWhere("l.level = :level", { level: query.level });
    if (query.tag) qb.andWhere("l.tag = :tag", { tag: query.tag });
    if (query.q) qb.andWhere("l.message LIKE :q", { q: `%${query.q.replace(/[\\%_]/g, "\\$&")}%` });
    if (query.from) qb.andWhere("l.loggedAt >= :from", { from: new Date(query.from) });
    if (query.to) qb.andWhere("l.loggedAt <= :to", { to: new Date(query.to) });
    if (query.beforeId) qb.andWhere("l.id < :beforeId", { beforeId: query.beforeId });

    const rows = await qb.getMany();
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  @Get("tags")
  async tags() {
    const rows = await this.repo
      .createQueryBuilder("l")
      .select("DISTINCT l.tag", "tag")
      .where("l.tag IS NOT NULL")
      .orderBy("l.tag")
      .getRawMany<{ tag: string }>();
    return rows.map((r) => r.tag);
  }

  /** 새로 수집된 로그를 SSE로 흘려보낸다. 프록시 타임아웃 방지용으로 주기적으로 ping 이벤트를 보낸다. */
  @Sse("stream")
  stream(): Observable<MessageEvent> {
    const logs = this.collector.saved$.pipe(
      mergeMap((entries) => rxFrom(entries)),
      map((entry): MessageEvent => ({ type: "log", data: entry })),
    );
    const ping = interval(KEEPALIVE_MS).pipe(map((): MessageEvent => ({ type: "ping", data: "" })));
    return merge(logs, ping);
  }
}
