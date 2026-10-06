import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { readFileSync } from "node:fs";
import { AppModule } from "./app.module";

async function bootstrap() {
  process.loadEnvFile(); // HTTPS 옵션이 앱 생성 시점에 필요해서 ConfigModule보다 먼저 .env를 읽는다.
  const { TLS_CERT_PATH, TLS_KEY_PATH, PORT = "3000" } = process.env;

  // 인증서가 설정된 경우에만 외부(Cloudflare)에 HTTPS로 연다. 아니면 로컬에서만 받는다 (실수로 HTTP가 외부에 열리는 것 방지).
  const tls = TLS_CERT_PATH && TLS_KEY_PATH;
  const app = await NestFactory.create(
    AppModule,
    tls ? { httpsOptions: { cert: readFileSync(TLS_CERT_PATH), key: readFileSync(TLS_KEY_PATH) } } : {},
  );
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.listen(PORT, tls ? "0.0.0.0" : "127.0.0.1");
}
void bootstrap();
