import { BadRequestException, Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/jwt.strategy";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, resolveSort } from "../common/paging";
import { allowedAccessSorts, type LoginMethod } from "./access-log.view";
import { AccessLogService } from "./access-log.service";

class ListAccessLogsQuery {
  @IsOptional() @Transform(({ value }) => (value === "true" ? true : value === "false" ? false : value)) @IsBoolean() success?: boolean;
  @IsOptional() @IsIn(["password", "guest"]) method?: LoginMethod;
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
    const sort = resolveSort(query.sort, query.order, allowedAccessSorts(req.user.role));
    if (!sort) throw new BadRequestException(`정렬할 수 없는 열입니다: ${query.sort}`);
    return this.service.list(req.user.role, { ...query, sort });
  }
}
