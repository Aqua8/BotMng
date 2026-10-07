import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Repository } from "typeorm";
import { JWT_ALGORITHM, TokenPayload, isTokenUserCurrent } from "./token-user";
import { Role, User } from "./user.entity";

export interface AuthUser {
  username: string;
  role: Role;
  /** DB 를 확인하지 못해 토큰 내용만 믿은 경우. @AllowWhenDbDown() 이 붙은 핸들러가 아니면 가드가 거절한다. */
  dbUnavailable?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow("JWT_SECRET"),
      algorithms: [JWT_ALGORITHM],
    });
  }

  /** 서명이 맞아도 계정이 지금도 있고 같은지 DB 로 다시 확인한다. DB 를 못 읽으면 토큰 내용으로 두되 표시를 남긴다. */
  async validate(payload: TokenPayload): Promise<AuthUser> {
    let user: User | null;
    try {
      user = await this.users.findOneBy({ id: payload.sub });
    } catch {
      return { username: payload.username, role: payload.role, dbUnavailable: true };
    }
    if (!isTokenUserCurrent(payload, user)) throw new UnauthorizedException("로그인이 만료되었거나 계정이 바뀌었습니다");
    return { username: payload.username, role: payload.role };
  }
}
