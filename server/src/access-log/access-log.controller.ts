import { BadRequestException, Controller, ForbiddenException, Get, Query, Req, UseGuards } from "@nestjs/common";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/jwt.strategy";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, resolveSort, sortErrorMessage } from "../common/paging";
import { allowedAccessSorts, canViewAccessLogs, type LoginMethod } from "./access-log.view";
import { AccessLogService } from "./access-log.service";

class ListAccessLogsQuery {
  @IsOptional() @Transform(({ value }) => (value === "true" ? true : value === "false" ? false : value)) @IsBoolean() success?: boolean;
  @IsOptional() @IsIn(["password", "guest", "session", "service"]) method?: LoginMethod;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsIn([...PAGE_SIZES]) pageSize: number = DEFAULT_PAGE_SIZE;
  @IsOptional() @IsString() sort?: string;
  @IsOptional() @IsIn(["asc", "desc"]) order?: "asc" | "desc";
}

@UseGuards(JwtAuthGuard)
@Controller("access-logs")
export class AccessLogController {
  constructor(private readonly service: AccessLogService) {}

  @Get()
  list(@Query() query: ListAccessLogsQuery, @Req() req: { user: AuthUser }) {
    if (!canViewAccessLogs(req.user.role)) throw new ForbiddenException("접속 로그는 관리자만 볼 수 있습니다");
    const allowed = allowedAccessSorts(req.user.role);
    const sort = resolveSort(query.sort, query.order, allowed);
    if (!sort) throw new BadRequestException(sortErrorMessage(allowed));
    return this.service.list(req.user.role, { ...query, sort });
  }
}
