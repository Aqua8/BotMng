import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AllowService } from "../auth/service-access";
import { HealthService } from "./health.service";

@UseGuards(JwtAuthGuard)
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @AllowService() // DevMng 서비스 계정이 상태만 조회한다
  @Get()
  check() {
    return this.health.check();
  }
}
