import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { LogEntry } from "./log-entry.entity";

const RETENTION_DAYS = 365;

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(@InjectRepository(LogEntry) private readonly repo: Repository<LogEntry>) {}

  @Cron("0 30 3 * * *")
  async purge() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const { affected } = await this.repo.delete({ loggedAt: LessThan(cutoff) });
    this.logger.log(`보관 기간(${RETENTION_DAYS}일) 초과 로그 삭제: ${affected ?? 0}건`);
  }
}
