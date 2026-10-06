import { BlockList } from "node:net";

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
