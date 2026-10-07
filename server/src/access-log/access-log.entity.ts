import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

import type { LoginMethod } from "./access-log.view";

@Entity("access_logs")
export class AccessLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: "datetime", precision: 3 })
  loggedAt: Date;

  @Column({ type: "varchar", length: 64 })
  username: string;

  @Column({ type: "boolean" })
  success: boolean;

  @Column({ type: "enum", enum: ["password", "guest", "session", "service"] })
  method: LoginMethod;

  @Column({ type: "varchar", length: 45 })
  ip: string;

  @Column({ type: "varchar", length: 2, nullable: true })
  country: string | null;

  @Column({ type: "varchar", length: 64 })
  os: string;

  @Column({ type: "varchar", length: 64 })
  browser: string;

  @Column({ type: "varchar", length: 16 })
  device: string;

  @Column({ type: "varchar", length: 512 })
  userAgent: string;
}
