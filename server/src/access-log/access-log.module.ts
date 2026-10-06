import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessLog } from "./access-log.entity";
import { AccessLogController } from "./access-log.controller";
import { AccessLogService } from "./access-log.service";

@Module({
  imports: [TypeOrmModule.forFeature([AccessLog])],
  controllers: [AccessLogController],
  providers: [AccessLogService],
  exports: [AccessLogService],
})
export class AccessLogModule {}
