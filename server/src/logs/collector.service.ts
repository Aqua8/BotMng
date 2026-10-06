import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { open, stat } from "node:fs/promises";
import { Subject } from "rxjs";
import { DataSource } from "typeorm";
import { LogEntry } from "./log-entry.entity";
import { LogOffset } from "./log-offset.entity";
import { LogSource, parseChunk } from "./log-parser";

const POLL_MS = 1000;

/** out.log / error.log 를 주기적으로 읽어(tail) 새로 추가된 줄을 DB에 저장한다. */
@Injectable()
export class CollectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CollectorService.name);
  private timer?: NodeJS.Timeout;
  private busy = false;
  private paths: Record<LogSource, string>;

  /** 새로 저장된 항목 (실시간 스트리밍용) */
  readonly saved$ = new Subject<LogEntry[]>();

  constructor(
    config: ConfigService,
    @InjectDataSource() private readonly ds: DataSource,
  ) {
    this.paths = {
      out: config.getOrThrow("BOT_OUT_LOG"),
      error: config.getOrThrow("BOT_ERROR_LOG"),
    };
  }

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), POLL_MS);
    void this.tick();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  private async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      for (const source of ["out", "error"] as const) await this.collect(source);
    } catch (err) {
      this.logger.error("로그 수집 실패", err as Error);
    } finally {
      this.busy = false;
    }
  }

  private async collect(source: LogSource) {
    const path = this.paths[source];
    const st = await stat(path).catch(() => null);
    if (!st) return;

    const saved = await this.ds.getRepository(LogOffset).findOneBy({ source });
    let offset = saved?.offset ?? 0;
    if (st.size < offset) offset = 0; // 파일이 줄었다 = 비워지거나 교체됨
    if (st.size === offset) return;

    const buf = Buffer.alloc(st.size - offset);
    const fh = await open(path, "r");
    try {
      await fh.read(buf, 0, buf.length, offset);
    } finally {
      await fh.close();
    }

    // 개행으로 끝나지 않은 마지막 줄은 아직 쓰는 중이므로 다음 주기로 미룬다.
    const end = buf.lastIndexOf(0x0a);
    if (end === -1) return;
    const text = buf.subarray(0, end + 1).toString("utf8");
    const entries = parseChunk(source, text, offset, st.mtime).map((e) => Object.assign(new LogEntry(), e));

    const newOffset = offset + end + 1;
    const stored = await this.ds.transaction(async (m) => {
      const result = entries.length ? await m.save(entries) : [];
      await m.save(LogOffset, { source, offset: newOffset });
      return result;
    });
    if (stored.length) this.saved$.next(stored);
  }
}
