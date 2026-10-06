import { BadRequestException, Controller, ForbiddenException, Get, MessageEvent, Query, Req, Res, Sse, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Observable, interval, map, merge, mergeMap, from as rxFrom } from "rxjs";
import { Repository, SelectQueryBuilder } from "typeorm";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/jwt.strategy";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, pageOffset, resolveSort, sortErrorMessage } from "../common/paging";
import { CollectorService } from "./collector.service";
import { capRows, formatKst, toCsv } from "./csv";
import { LogEntry } from "./log-entry.entity";

/** 목록과 CSV 내보내기가 함께 쓰는 필터·정렬 */
class LogFilterQuery {
  @IsOptional() @IsIn(["out", "error"]) source?: "out" | "error";
  @IsOptional() @IsIn(["info", "warn", "error"]) level?: "info" | "warn" | "error";
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() sort?: string;
  @IsOptional() @IsIn(["asc", "desc"]) order?: "asc" | "desc";
}

class ListLogsQuery extends LogFilterQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsIn([...PAGE_SIZES]) pageSize: number = DEFAULT_PAGE_SIZE;
}

const EXPORT_MAX_ROWS = 50_000; // CSV 로 내보낼 수 있는 최대 건수 (넘으면 잘렸음을 헤더로 알린다)

const KEEPALIVE_MS = 25_000;
const LOG_SORTS = ["loggedAt", "level", "source", "tag", "outcome", "durationMs"] as const; // 메시지는 길어서 정렬 의미가 적고 검색이 있어 제외

@UseGuards(JwtAuthGuard)
@Controller("logs")
export class LogsController {
  constructor(
    @InjectRepository(LogEntry) private readonly repo: Repository<LogEntry>,
    private readonly collector: CollectorService,
  ) {}

  /** 필터와 정렬을 적용한 조회. 목록과 CSV 내보내기가 똑같은 조건을 쓰도록 한 곳에 둔다. 같은 값끼리는 id 로 순서를 고정한다. */
  private filtered(query: LogFilterQuery): SelectQueryBuilder<LogEntry> {
    const sort = resolveSort(query.sort, query.order, LOG_SORTS);
    if (!sort) throw new BadRequestException(sortErrorMessage(LOG_SORTS));

    const qb = this.repo.createQueryBuilder("l").orderBy(`l.${sort.column}`, sort.direction).addOrderBy("l.id", sort.direction);
    if (query.source) qb.andWhere("l.source = :source", { source: query.source });
    if (query.level) qb.andWhere("l.level = :level", { level: query.level });
    if (query.tag) qb.andWhere("l.tag = :tag", { tag: query.tag });
    if (query.q) qb.andWhere("l.message LIKE :q", { q: `%${query.q.replace(/[\\%_]/g, "\\$&")}%` });
    if (query.from) qb.andWhere("l.loggedAt >= :from", { from: new Date(query.from) });
    if (query.to) qb.andWhere("l.loggedAt <= :to", { to: new Date(query.to) });
    return qb;
  }

  /** 페이지 단위 목록 */
  @Get()
  async list(@Query() query: ListLogsQuery) {
    const [items, total] = await this.filtered(query).skip(pageOffset(query.page, query.pageSize)).take(query.pageSize).getManyAndCount();
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /**
   * 현재 필터·정렬 기준 CSV 내보내기. **관리자만** 가능하다 (게스트는 403).
   * 최대 50,000건이며 넘으면 X-Truncated 헤더로 알린다. Excel 에서 한글이 깨지지 않도록 UTF-8 BOM 을 붙인다.
   */
  @Get("export.csv")
  async exportCsv(@Query() query: LogFilterQuery, @Req() req: { user: AuthUser }, @Res({ passthrough: true }) res: Response) {
    if (req.user.role !== "admin") throw new ForbiddenException("관리자만 내보낼 수 있습니다");
    const found = await this.filtered(query).take(EXPORT_MAX_ROWS + 1).getMany();
    const { rows, truncated } = capRows(found, EXPORT_MAX_ROWS);

    const stamp = formatKst(new Date()).replace(/[-: ]/g, "");
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="botmng-logs-${stamp.slice(0, 8)}-${stamp.slice(8)}.csv"`,
      "X-Row-Count": String(rows.length),
      "X-Truncated": String(truncated),
      "Cache-Control": "no-store",
    });
    return "\uFEFF" + toCsv(rows);
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
