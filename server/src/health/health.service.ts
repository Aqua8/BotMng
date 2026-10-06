import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { performance } from "node:perf_hooks";
import { DataSource } from "typeorm";
import { AccessLog } from "../access-log/access-log.entity";
import { CollectorService } from "../logs/collector.service";
import { LogEntry } from "../logs/log-entry.entity";
import { describeCollectorError, evaluateHealth } from "./health.logic";

const DB_TIMEOUT_MS = 3000;

const withTimeout = <T>(p: Promise<T>) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })), DB_TIMEOUT_MS))]);

/** DB 와 로그 수집기의 상태. DB 가 죽어도 이 API 는 응답하므로(JWT 인증은 DB 를 쓰지 않음) "연결 안 됨"을 알려줄 수 있다. */
@Injectable()
export class HealthService {
  private readonly startedAt = new Date();

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly collector: CollectorService,
  ) {}

  async check() {
    const db = await this.checkDb();
    const sources = this.collector.status();
    const { status, issues } = evaluateHealth({ db, sources });
    return {
      checkedAt: new Date(),
      status,
      issues,
      server: { startedAt: this.startedAt, uptimeSec: Math.round(process.uptime()) },
      db,
      collector: { sources },
    };
  }

  private async checkDb() {
    const t0 = performance.now();
    try {
      await withTimeout(this.ds.query("SELECT 1"));
      const latencyMs = Math.round(performance.now() - t0);
      const [logCount, accessLogCount, size] = await withTimeout(
        Promise.all([
          this.ds.getRepository(LogEntry).count(),
          this.ds.getRepository(AccessLog).count(),
          this.ds.query("SELECT COALESCE(SUM(data_length + index_length), 0) AS bytes FROM information_schema.tables WHERE table_schema = DATABASE()"),
        ]),
      );
      return { ok: true as const, latencyMs, logCount, accessLogCount, sizeBytes: Number(size[0]?.bytes ?? 0) };
    } catch (err) {
      return { ok: false as const, error: describeCollectorError(err) };
    }
  }
}
