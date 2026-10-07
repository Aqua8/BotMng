import { BlockList } from "node:net";
import { normalizeIp } from "@nestjs/throttler/dist/ip"; // 순수 함수만 있는 파일이라 Jest 에서도 불러올 수 있다

// https://www.cloudflare.com/ips-v4 , https://www.cloudflare.com/ips-v6 (2026-10 기준). 바뀌면 여기를 갱신한다.
const CLOUDFLARE_V4 = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18",
  "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
  "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
];
const CLOUDFLARE_V6 = ["2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32", "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32"];

const cloudflare = new BlockList();
for (const cidr of CLOUDFLARE_V4) {
  const [net, prefix] = cidr.split("/");
  cloudflare.addSubnet(net, Number(prefix), "ipv4");
}
for (const cidr of CLOUDFLARE_V6) {
  const [net, prefix] = cidr.split("/");
  cloudflare.addSubnet(net, Number(prefix), "ipv6");
}

function fromCloudflare(ip: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip); // IPv6 소켓으로 들어온 IPv4
  if (mapped) return cloudflare.check(mapped[1], "ipv4");
  return cloudflare.check(ip, ip.includes(":") ? "ipv6" : "ipv4");
}

/** 실제 접속자 IP. 접속한 소켓이 Cloudflare 대역일 때만 CF-Connecting-IP를 믿는다 (직접 접속해 헤더를 위조하는 우회 방지). */
export function clientIp(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): string {
  const socketIp = req.ip ?? "";
  const cf = req.headers?.["cf-connecting-ip"];
  const header = Array.isArray(cf) ? cf[0] : cf;
  return header && socketIp && fromCloudflare(socketIp) ? header : socketIp;
}

/** 접속자 국가(ISO 2자리). Cloudflare 가 붙여주는 CF-IPCountry 를 같은 이유로 Cloudflare 대역에서 온 요청에서만 신뢰한다. */
export function clientCountry(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): string | null {
  const raw = req.headers?.["cf-ipcountry"];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase();
  return value && /^[A-Z]{2}$/.test(value) && req.ip && fromCloudflare(req.ip) ? value : null;
}

/**
 * 횟수 제한에 쓰는 접속자 키. 실제 접속자 IP 를 쓰되 IPv6 는 /64 단위로 묶는다.
 * (IPv6 는 한 접속자가 같은 /64 안의 주소를 마음대로 바꿔 쓸 수 있어서, 주소 하나씩 세면 제한을 피할 수 있다.)
 * ThrottlerGuard 의 기본 추적기는 이렇게 묶지만, 여기서는 Cloudflare 뒤의 실제 IP 를 쓰려고 추적기를 직접 구현하므로 따로 적용한다.
 */
export function throttleKey(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): string {
  return normalizeIp(clientIp(req), 64);
}
