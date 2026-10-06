import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "node:path";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { User } from "./auth/user.entity";
import { LogEntry } from "./logs/log-entry.entity";
import { LogOffset } from "./logs/log-offset.entity";
import { LogsModule } from "./logs/logs.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // 빌드된 React 화면(web/dist)을 같은 서버에서 서빙한다. /api 요청은 제외.
    ServeStaticModule.forRoot({ rootPath: join(__dirname, "..", "..", "web", "dist"), exclude: ["/api/{*path}"] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: "mariadb",
        host: c.get("DB_HOST", "127.0.0.1"),
        port: Number(c.get("DB_PORT", "3306")),
        username: c.getOrThrow("DB_USER"),
        password: c.getOrThrow("DB_PASSWORD"),
        database: c.getOrThrow("DB_NAME"),
        timezone: "+09:00", // DB에는 한국 시간(KST)으로 저장하고 읽는다
        entities: [LogEntry, LogOffset, User],
        synchronize: true, // plan.md: 소규모 개인용이라 마이그레이션 대신 synchronize 사용
      }),
    }),
    LogsModule,
    AuthModule,
  ],
})
export class AppModule {}
