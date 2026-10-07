import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export type Role = "admin" | "guest" | "service"; // service = 외부 서비스(DevMng) 전용. 화면 로그인 불가, /api/health 만 허용

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 64, unique: true })
  username: string;

  @Column({ type: "varchar", length: 100 })
  passwordHash: string;

  @Column({ type: "enum", enum: ["admin", "guest", "service"] })
  role: Role;
}
