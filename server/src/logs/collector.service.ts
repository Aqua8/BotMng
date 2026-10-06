import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { open, stat } from "node:fs/promises";
import { Subject } from "rxjs";
import { DataSource } from "typeorm";
import { LogEntry } from "./log-entry.entity";
import { LogOffset } from "./log-offset.entity";
import { SourceStatus, describeCollectorError, lagBytes } from "../health/health.logic";
import { LogSource, parseChunk } from "./log-parser";

const POLL_MS = 1000;

/** 시스템 상태 화면용으로 파일별 수집 상태를 메모리에 기록한다. */
interface SourceState {
  fileSize: number | null;
  offset: number;
  fileMissing: boolean;
  lastPollAt: Date | null;
  lastReadAt: Date | null;
  lastError: { kind: string; at: Date } | null;
}
const blankState = (): SourceState => ({ fileSize: null, offset: 0, fileMissing: false, lastPollAt: null, lastReadAt: null, lastError: null });

/** out.log / error.log 를 주기적으로 읽어(tail) 새로 추가된 줄을 DB에 저장한다. */
@Injectable()
export class CollectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CollectorService.name);
  private timer?: NodeJS.Timeout;
  private busy = false;
  private paths: Record<LogSource, string>;
  private readonly state: Record<LogSource, SourceState> = { out: blankState(), error: blankState() };

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

  /** 파일별 수집 상태 (시스템 상태 화면용). 로컬 파일 경로는 포함하지 않는다. */
  status(): SourceStatus[] {
    return (["out", "error"] as const).map((source) => {
      const st = this.state[source];
      return { source, ...st, lagBytes: lagBytes(st.fileSize, st.offset) };
    });
  }

  private async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      for (const source of ["out", "error"] as const) {
        this.state[source].lastPollAt = new Date();
        try {
          await this.collect(source);
        } catch (err) {
          // 오류는 종류 이름만 기록한다 (메시지에는 로컬 경로가 섞일 수 있음). 자세한 내용은 서버 로그에 남는다.
          this.state[source].lastError = { kind: describeCollectorError(err), at: new Date() };
          this.logger.error(`로그 수집 실패 (${source})`, err as Error);
        }
      }
    } finally {
      this.busy = false;
    }
  }

  private async collect(source: LogSource) {
    const path = this.paths[source];
    const st = await stat(path).catch(() => null);
    this.state[source].fileMissing = !st;
    this.state[source].fileSize = st?.size ?? null;
    if (!st) return;

    const saved = await this.ds.getRepository(LogOffset).findOneBy({ source });
    let offset = saved?.offset ?? 0;
    if (st.size < offset) offset = 0; // 파일이 줄었다 = 비워지거나 교체됨
    this.state[source].offset = offset;
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
    this.state[source].offset = newOffset;
    this.state[source].lastReadAt = new Date();
    if (stored.length) this.saved$.next(stored);
  }
}
