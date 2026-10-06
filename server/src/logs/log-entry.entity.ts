import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { LogLevel, LogSource } from "./log-parser";

@Entity("log_entries")
@Index(["source", "fileOffset"], { unique: true })
export class LogEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "enum", enum: ["out", "error"] })
  source: LogSource;

  @Index()
  @Column({ type: "enum", enum: ["info", "warn", "error"] })
  level: LogLevel;

  @Index()
  @Column({ type: "varchar", length: 64, nullable: true })
  tag: string | null;

  @Column({ type: "text" })
  message: string;

  @Index()
  @Column({ type: "datetime", precision: 3 })
  loggedAt: Date;

  @Column({ type: "bigint", transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  fileOffset: number;
}
