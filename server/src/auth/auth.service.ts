import { Injectable, Logger, OnApplicationBootstrap, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { compare, hash } from "bcryptjs";
import { Repository } from "typeorm";
import { Role, User } from "./user.entity";

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** 관리자/게스트 계정을 .env 비밀번호 기준으로 맞춘다. 비밀번호를 바꾸고 재시작하면 반영된다. */
  async onApplicationBootstrap() {
    const seeds: [string, string, Role][] = [
      ["admin", this.config.getOrThrow("ADMIN_PASSWORD"), "admin"],
      ["guest", this.config.getOrThrow("GUEST_PASSWORD"), "guest"],
    ];
    for (const [username, password, role] of seeds) {
      const user = await this.users.findOneBy({ username });
      if (user && (await compare(password, user.passwordHash)) && user.role === role) continue;
      await this.users.save({ ...user, username, role, passwordHash: await hash(password, 10) });
      this.logger.log(`계정 시드: ${username} (${role})`);
    }
  }

  async login(username: string, password: string) {
    const user = await this.users.findOneBy({ username });
    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException("아이디 또는 비밀번호가 올바르지 않습니다");
    }
    const accessToken = await this.jwt.signAsync({ sub: user.id, username: user.username, role: user.role });
    return { accessToken, username: user.username, role: user.role };
  }
}
