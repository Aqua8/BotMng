import { Column, Entity, PrimaryColumn } from "typeorm";
import type { LogSource } from "./log-parser";

@Entity("log_offsets")
export class LogOffset {
  @PrimaryColumn({ type: "varchar", length: 8 })
  source: LogSource;

  @Column({ type: "bigint", transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  offset: number;
}
