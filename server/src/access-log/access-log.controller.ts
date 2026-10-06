import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/jwt.strategy";
import type { LoginMethod } from "./access-log.view";
import { AccessLogService } from "./access-log.service";

class ListAccessLogsQuery {
  @IsOptional() @Transform(({ value }) => (value === "true" ? true : value === "false" ? false : value)) @IsBoolean() success?: boolean;
  @IsOptional() @IsIn(["password", "guest"]) method?: LoginMethod;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() beforeId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit: number = 50;
}

@UseGuards(JwtAuthGuard)
@Controller("access-logs")
export class AccessLogController {
  constructor(private readonly service: AccessLogService) {}

  @Get()
  list(@Query() query: ListAccessLogsQuery, @Req() req: { user: AuthUser }) {
    return this.service.list(req.user.role, query);
  }
}
