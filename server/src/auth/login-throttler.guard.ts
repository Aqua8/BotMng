import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { throttleKey } from "./client-ip";

/** 로그인 시도 횟수 제한(IP당). Cloudflare 뒤에서는 소켓 IP가 Cloudflare 것이므로 실제 접속자 IP로 구분하고, IPv6는 /64로 묶는다. */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return throttleKey(req);
  }
}
