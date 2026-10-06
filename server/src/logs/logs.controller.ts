import { BadRequestException, Controller, Get, MessageEvent, Query, Sse, UseGuards } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Observable, interval, map, merge, mergeMap, from as rxFrom } from "rxjs";
import { Repository } from "typeorm";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, pageOffset, resolveSort } from "../common/paging";
import { CollectorService } from "./collector.service";
import { LogEntry } from "./log-entry.entity";

class ListLogsQuery {
  @IsOptional() @IsIn(["out", "error"]) source?: "out" | "error";
  @IsOptional() @IsIn(["info", "warn", "error"]) level?: "info" | "warn" | "error";
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsIn([...PAGE_SIZES]) pageSize: number = DEFAULT_PAGE_SIZE;
  @IsOptional() @IsString() sort?: string;
  @IsOptional() @IsIn(["asc", "desc"]) order?: "asc" | "desc";
}

const KEEPALIVE_MS = 25_000;
const LOG_SORTS = ["loggedAt", "level", "source", "tag", "outcome", "durationMs"] as const; // 메시지는 길어서 정렬 의미가 적고 검색이 있어 제외

@UseGuards(JwtAuthGuard)
@Controller("logs")
export class LogsController {
  constructor(
    @InjectRepository(LogEntry) private readonly repo: Repository<LogEntry>,
    private readonly collector: CollectorService,
  ) {}

  /** 페이지 단위 목록. 같은 값끼리는 id 로 순서를 고정한다. */
  @Get()
  async list(@Query() query: ListLogsQuery) {
    const sort = resolveSort(query.sort, query.order, LOG_SORTS);
    if (!sort) throw new BadRequestException(`정렬할 수 없는 열입니다: ${query.sort}`);

    const qb = this.repo.createQueryBuilder("l").orderBy(`l.${sort.column}`, sort.direction).addOrderBy("l.id", sort.direction).skip(pageOffset(query.page, query.pageSize)).take(query.pageSize);
    if (query.source) qb.andWhere("l.source = :source", { source: query.source });
    if (query.level) qb.andWhere("l.level = :level", { level: query.level });
    if (query.tag) qb.andWhere("l.tag = :tag", { tag: query.tag });
    if (query.q) qb.andWhere("l.message LIKE :q", { q: `%${query.q.replace(/[\\%_]/g, "\\$&")}%` });
    if (query.from) qb.andWhere("l.loggedAt >= :from", { from: new Date(query.from) });
    if (query.to) qb.andWhere("l.loggedAt <= :to", { to: new Date(query.to) });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
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
