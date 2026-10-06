import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { IsString, MaxLength } from "class-validator";
import { AccessLogService } from "../access-log/access-log.service";
import { LoginThrottlerGuard } from "./login-throttler.guard";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthUser } from "./jwt.strategy";

class LoginDto {
  @IsString() @MaxLength(64) username: string;
  @IsString() @MaxLength(128) password: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly accessLog: AccessLogService,
  ) {}

  @UseGuards(LoginThrottlerGuard)
  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    try {
      const result = await this.auth.login(dto.username, dto.password);
      await this.accessLog.record(req, dto.username, true, "password");
      return result;
    } catch (err) {
      await this.accessLog.record(req, dto.username, false, "password");
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() req: { user: AuthUser }) {
    return req.user;
  }
}
