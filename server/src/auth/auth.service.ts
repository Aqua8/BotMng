import { Injectable, Logger, OnApplicationBootstrap, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { compare, hash } from "bcryptjs";
import { Repository } from "typeorm";
import { Role, User } from "./user.entity";

export const SERVICE_USERNAME = "devmng";
const SERVICE_TOKEN_TTL: JwtSignOptions["expiresIn"] = "15m"; // 서비스 토큰은 짧게 쓰고 만료되면 다시 발급받는다

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 관리자/게스트 계정을 .env 비밀번호 기준으로 맞춘다. 비밀번호를 바꾸고 재시작하면 반영된다.
   * 서비스 계정은 DEVMNG_PASSWORD 가 있을 때만 만들고, 비워 두면 기존 서비스 계정을 지운다.
   */
  async onApplicationBootstrap() {
    const seeds: [string, string, Role][] = [
      ["admin", this.config.getOrThrow("ADMIN_PASSWORD"), "admin"],
      ["guest", this.config.getOrThrow("GUEST_PASSWORD"), "guest"],
    ];
    const servicePassword = this.config.get<string>("DEVMNG_PASSWORD");
    if (servicePassword) seeds.push([SERVICE_USERNAME, servicePassword, "service"]);
    else await this.users.delete({ role: "service" });
    for (const [username, password, role] of seeds) {
      const user = await this.users.findOneBy({ username });
      if (user && (await compare(password, user.passwordHash)) && user.role === role) continue;
      await this.users.save({ ...user, username, role, passwordHash: await hash(password, 10) });
      this.logger.log(`계정 시드: ${username} (${role})`);
    }
  }

  async login(username: string, password: string) {
    const user = await this.users.findOneBy({ username });
    // 서비스 계정은 화면(아이디/비밀번호) 로그인을 막는다. 틀린 비밀번호와 같은 메시지로 응답해 계정 존재를 알리지 않는다.
    if (!user || user.role === "service" || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException("아이디 또는 비밀번호가 올바르지 않습니다");
    }
    return this.issue(user);
  }

  /** 서비스 계정 전용 토큰 발급. 비밀번호만 받고, 토큰은 짧게(15분) 유효하다. */
  async loginAsService(password: string) {
    const user = await this.users.findOneBy({ username: SERVICE_USERNAME, role: "service" });
    if (!user || !(await compare(password, user.passwordHash))) {
      throw new UnauthorizedException("서비스 계정 인증에 실패했습니다");
    }
    return this.issue(user, SERVICE_TOKEN_TTL);
  }

  /** 게스트 버튼용. 비밀번호 없이 읽기 전용 게스트 계정의 토큰을 발급한다. */
  async loginAsGuest() {
    const user = await this.users.findOneBy({ username: "guest", role: "guest" });
    if (!user) throw new UnauthorizedException("게스트 계정을 사용할 수 없습니다");
    return this.issue(user);
  }

  private async issue(user: User, expiresIn?: JwtSignOptions["expiresIn"]) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, username: user.username, role: user.role }, expiresIn ? { expiresIn } : undefined);
    return { accessToken, username: user.username, role: user.role };
  }
}
