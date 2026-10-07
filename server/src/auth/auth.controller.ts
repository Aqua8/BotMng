import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { IsString, MaxLength } from "class-validator";
import { AccessLogService } from "../access-log/access-log.service";
import { LoginThrottlerGuard } from "./login-throttler.guard";
import { AuthService, SERVICE_USERNAME } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthUser } from "./jwt.strategy";

class LoginDto {
  @IsString() @MaxLength(64) username: string;
  @IsString() @MaxLength(128) password: string;
}

class ServiceLoginDto {
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

  /** 게스트 버튼. 누구나 읽기 전용 게스트로 들어올 수 있으며, 일반 로그인과 같은 횟수 제한과 접속 로그 기록이 적용된다. */
  @UseGuards(LoginThrottlerGuard)
  @Post("guest")
  @HttpCode(200)
  async guest(@Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    try {
      const result = await this.auth.loginAsGuest();
      await this.accessLog.record(req, result.username, true, "guest");
      return result;
    } catch (err) {
      await this.accessLog.record(req, "guest", false, "guest");
      throw err;
    }
  }

  /** 서비스 계정(DevMng) 전용. 화면 로그인은 막혀 있고 이 경로로만 토큰을 받는다. 같은 횟수 제한과 접속 로그(관리자에게만 보임)가 적용된다. */
  @UseGuards(LoginThrottlerGuard)
  @Post("service")
  @HttpCode(200)
  async service(@Body() dto: ServiceLoginDto, @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    try {
      const result = await this.auth.loginAsService(dto.password);
      await this.accessLog.record(req, SERVICE_USERNAME, true, "service");
      return result;
    } catch (err) {
      await this.accessLog.record(req, SERVICE_USERNAME, false, "service");
      throw err;
    }
  }

  /**
   * 저장된 로그인으로 화면을 다시 열었음을 알린다 (접속 로그에 method=session 으로 기록, 같은 접속자는 1시간에 한 번만).
   * 토큰 검증도 겸한다: 만료된 토큰이면 401.
   */
  @UseGuards(LoginThrottlerGuard, JwtAuthGuard)
  @Post("resume")
  @HttpCode(204)
  async resume(@Req() req: { ip?: string; headers: Record<string, string | string[] | undefined>; user: AuthUser }) {
    await this.accessLog.recordResume(req, req.user.username);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() req: { user: AuthUser }) {
    return req.user;
  }
}
