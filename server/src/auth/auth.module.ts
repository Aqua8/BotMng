import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessLogModule } from "../access-log/access-log.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { LoginLockout } from "./login-lockout";
import { JwtStrategy } from "./jwt.strategy";
import { JWT_ALGORITHM } from "./token-user";
import { User } from "./user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AccessLogModule,
    PassportModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]), // 로그인: IP당 분당 10회
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ secret: c.getOrThrow("JWT_SECRET"), signOptions: { expiresIn: "12h", algorithm: JWT_ALGORITHM }, verifyOptions: { algorithms: [JWT_ALGORITHM] } }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, { provide: LoginLockout, useFactory: () => new LoginLockout() }], // 서버 하나에 하나(메모리)
})
export class AuthModule {}
