import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { clientCountry, clientIp } from "../auth/client-ip";
import type { Role } from "../auth/user.entity";
import { AccessLog } from "./access-log.entity";
import { Sort, pageOffset } from "../common/paging";
import { parseUserAgent } from "./access-log.util";
import { LoginMethod, toView } from "./access-log.view";

const RETENTION_DAYS = 365;

type RequestLike = { ip?: string; headers: Record<string, string | string[] | undefined> };

@Injectable()
export class AccessLogService {
  private readonly logger = new Logger(AccessLogService.name);

  constructor(@InjectRepository(AccessLog) private readonly repo: Repository<AccessLog>) {}

  /** 로그인 시도를 기록한다. 기록에 실패해도 로그인 자체는 막지 않는다. */
  async record(req: RequestLike, username: string, success: boolean, method: LoginMethod) {
    try {
      const ua = req.headers["user-agent"];
      const userAgent = (Array.isArray(ua) ? ua[0] : ua) ?? "";
      await this.repo.insert({
        loggedAt: new Date(),
        username: username.slice(0, 64),
        success,
        method,
        ip: clientIp(req).slice(0, 45),
        country: clientCountry(req),
        ...parseUserAgent(userAgent),
        userAgent: userAgent.slice(0, 512),
      });
    } catch (err) {
      this.logger.error("접속 로그 저장 실패", err as Error);
    }
  }

  /** 페이지 단위 목록. 정렬 열은 호출한 쪽에서 허용 목록으로 검증한 값이어야 한다. 같은 값끼리는 id 로 순서를 고정한다. */
  async list(role: Role, q: { success?: boolean; method?: LoginMethod; from?: string; to?: string; page: number; pageSize: number; sort: Sort }) {
    const qb = this.repo.createQueryBuilder("a").orderBy(`a.${q.sort.column}`, q.sort.direction).addOrderBy("a.id", q.sort.direction).skip(pageOffset(q.page, q.pageSize)).take(q.pageSize);
    if (q.success !== undefined) qb.andWhere("a.success = :success", { success: q.success });
    if (q.method) qb.andWhere("a.method = :method", { method: q.method });
    if (q.from) qb.andWhere("a.loggedAt >= :from", { from: new Date(q.from) });
    if (q.to) qb.andWhere("a.loggedAt <= :to", { to: new Date(q.to) });
    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map((r) => toView(r, role)), total, page: q.page, pageSize: q.pageSize };
  }

  @Cron("0 40 3 * * *")
  async purge() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const { affected } = await this.repo.delete({ loggedAt: LessThan(cutoff) });
    this.logger.log(`보관 기간(${RETENTION_DAYS}일) 초과 접속 로그 삭제: ${affected ?? 0}건`);
  }
}
