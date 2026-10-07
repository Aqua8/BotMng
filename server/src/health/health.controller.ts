import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/jwt.strategy";
import { AllowService, AllowWhenDbDown } from "../auth/service-access";
import { HealthService } from "./health.service";

@UseGuards(JwtAuthGuard)
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @AllowService() // DevMng 서비스 계정이 상태만 조회한다
  @AllowWhenDbDown() // DB 가 죽었을 때 "DB 연결 오류"를 알려 줘야 하므로 계정 DB 확인 없이도 응답한다
  @Get()
  check(@Req() req: { user: AuthUser }) {
    return this.health.check(req.user.role);
  }
}
