import { clientIp } from "./client-ip";

const req = (socketIp: string, cf?: string) => ({ ip: socketIp, headers: cf ? { "cf-connecting-ip": cf } : {} });

describe("clientIp", () => {
  it("Cloudflare IPv4 대역에서 온 요청은 CF-Connecting-IP를 사용한다", () => {
    expect(clientIp(req("173.245.48.10", "203.0.113.5"))).toBe("203.0.113.5");
  });

  it("Cloudflare IPv6 대역과 IPv4-mapped 주소도 인식한다", () => {
    expect(clientIp(req("2606:4700::1", "203.0.113.5"))).toBe("203.0.113.5");
    expect(clientIp(req("::ffff:104.16.0.1", "203.0.113.5"))).toBe("203.0.113.5");
  });

  it("Cloudflare가 아닌 곳에서 온 요청의 CF-Connecting-IP는 위조로 보고 무시한다", () => {
    expect(clientIp(req("198.51.100.7", "1.2.3.4"))).toBe("198.51.100.7");
  });

  it("헤더가 없으면 소켓 IP를 쓴다", () => {
    expect(clientIp(req("173.245.48.10"))).toBe("173.245.48.10");
  });
});
