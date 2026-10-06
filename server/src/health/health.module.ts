import { Module } from "@nestjs/common";
import { LogsModule } from "../logs/logs.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  imports: [LogsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
