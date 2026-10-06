import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CollectorService } from "./collector.service";
import { LogEntry } from "./log-entry.entity";
import { LogOffset } from "./log-offset.entity";
import { LogsController } from "./logs.controller";
import { StatsController } from "./stats.controller";
import { RetentionService } from "./retention.service";

@Module({
  imports: [TypeOrmModule.forFeature([LogEntry, LogOffset])],
  controllers: [LogsController, StatsController],
  providers: [CollectorService, RetentionService],
  exports: [CollectorService],
})
export class LogsModule {}
