import { ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { ALLOW_SERVICE, isRoleAllowed } from "./role-access";
import type { AuthUser } from "./jwt.strategy";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /** 토큰 검증 뒤 역할까지 확인한다. 서비스 계정은 @AllowService() 가 붙은 핸들러만 통과한다. */
  handleRequest<TUser = AuthUser>(err: unknown, user: AuthUser | false, info: unknown, context: ExecutionContext): TUser {
    const authUser = super.handleRequest(err, user, info, context) as AuthUser;
    const allowService = this.reflector.get<boolean>(ALLOW_SERVICE, context.getHandler()) ?? false;
    if (!isRoleAllowed(authUser.role, allowService)) throw new ForbiddenException("이 계정으로는 사용할 수 없는 기능입니다");
    return authUser as TUser;
  }
}
