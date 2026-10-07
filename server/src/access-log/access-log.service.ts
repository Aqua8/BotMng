import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, MoreThanOrEqual, Repository } from "typeorm";
import { clientCountry, clientIp } from "../auth/client-ip";
import type { Role } from "../auth/user.entity";
import { AccessLog } from "./access-log.entity";
import { Sort, pageOffset } from "../common/paging";
import { parseUserAgent } from "./access-log.util";
import { LoginMethod, RESUME_DEDUPE_MS, hiddenMethods, toView } from "./access-log.view";

const RETENTION_DAYS = 365;

type RequestLike = { ip?: string; headers: Record<string, string | string[] | undefined> };

@Injectable()
export class AccessLogService {
  private readonly logger = new Logger(AccessLogService.name);

  constructor(@InjectRepository(AccessLog) private readonly repo: Repository<AccessLog>) {}

  /** 요청에서 접속 정보(IP, 국가, 브라우저 등)를 뽑는다. */
  private describe(req: RequestLike) {
    const ua = req.headers["user-agent"];
    const userAgent = ((Array.isArray(ua) ? ua[0] : ua) ?? "").slice(0, 512);
    return { ip: clientIp(req).slice(0, 45), country: clientCountry(req), ...parseUserAgent(userAgent), userAgent };
  }

  /** 로그인 시도를 기록한다. 기록에 실패해도 로그인 자체는 막지 않는다. */
  async record(req: RequestLike, username: string, success: boolean, method: LoginMethod) {
    try {
      await this.repo.insert({ loggedAt: new Date(), username: username.slice(0, 64), success, method, ...this.describe(req) });
    } catch (err) {
      this.logger.error("접속 로그 저장 실패", err as Error);
    }
  }

  /**
   * 저장된 로그인으로 화면을 다시 연 것을 기록한다 (method=session).
   * 같은 계정·IP·브라우저의 성공 기록(로그인 포함)이 최근 1시간 안에 있으면 건너뛴다. 기록했으면 true.
   */
  async recordResume(req: RequestLike, username: string): Promise<boolean> {
    try {
      const d = this.describe(req);
      const since = new Date(Date.now() - RESUME_DEDUPE_MS);
      const recent = await this.repo.exists({ where: { username, success: true, ip: d.ip, userAgent: d.userAgent, loggedAt: MoreThanOrEqual(since) } });
      if (recent) return false;
      await this.repo.insert({ loggedAt: new Date(), username: username.slice(0, 64), success: true, method: "session", ...d });
      return true;
    } catch (err) {
      this.logger.error("접속 로그 저장 실패", err as Error);
      return false;
    }
  }

  /** 페이지 단위 목록. 정렬 열은 호출한 쪽에서 허용 목록으로 검증한 값이어야 한다. 같은 값끼리는 id 로 순서를 고정한다. */
  async list(role: Role, q: { success?: boolean; method?: LoginMethod; from?: string; to?: string; page: number; pageSize: number; sort: Sort }) {
    const qb = this.repo.createQueryBuilder("a").orderBy(`a.${q.sort.column}`, q.sort.direction).addOrderBy("a.id", q.sort.direction).skip(pageOffset(q.page, q.pageSize)).take(q.pageSize);
    const hidden = hiddenMethods(role);
    if (hidden.length) qb.andWhere("a.method NOT IN (:...hidden)", { hidden });
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
