import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessLogModule } from "../access-log/access-log.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { User } from "./user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AccessLogModule,
    PassportModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]), // 로그인: IP당 분당 10회
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ secret: c.getOrThrow("JWT_SECRET"), signOptions: { expiresIn: "12h" } }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
