import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { clientIp } from "./client-ip";

/** 로그인 시도 횟수 제한. Cloudflare 뒤에서는 소켓 IP가 Cloudflare 것이므로 clientIp()로 실제 접속자를 구분한다. */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return clientIp(req);
  }
}
