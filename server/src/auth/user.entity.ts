import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export type Role = "admin" | "guest";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 64, unique: true })
  username: string;

  @Column({ type: "varchar", length: 100 })
  passwordHash: string;

  @Column({ type: "enum", enum: ["admin", "guest"] })
  role: Role;
}
