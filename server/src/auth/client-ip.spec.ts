import { clientCountry, clientIp, throttleKey } from "./client-ip";

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

describe("clientCountry", () => {
  const withCountry = (socketIp: string, country?: string) => ({ ip: socketIp, headers: country ? { "cf-ipcountry": country } : {} });

  it("Cloudflare 에서 온 요청의 CF-IPCountry 를 사용한다 (대문자 2자리)", () => {
    expect(clientCountry(withCountry("173.245.48.10", "kr"))).toBe("KR");
  });

  it("Cloudflare 가 아닌 곳에서 온 요청이나 형식이 이상한 값은 null", () => {
    expect(clientCountry(withCountry("198.51.100.7", "KR"))).toBeNull();
    expect(clientCountry(withCountry("173.245.48.10", "KOREA"))).toBeNull();
    expect(clientCountry(withCountry("173.245.48.10"))).toBeNull();
  });
});

describe("throttleKey (횟수 제한 키)", () => {
  const req = (ip: string) => ({ ip, headers: {} });

  it("IPv4 는 그대로 쓴다", () => {
    expect(throttleKey(req("203.0.113.5"))).toBe("203.0.113.5");
  });

  it("IPv6 소켓으로 들어온 IPv4 는 IPv4 로 센다", () => {
    expect(throttleKey(req("::ffff:203.0.113.5"))).toBe("203.0.113.5");
  });

  it("같은 /64 안의 IPv6 주소는 한 접속자로 센다 (주소를 바꿔 제한을 피하지 못하게)", () => {
    const a = throttleKey(req("2001:db8:abcd:12:1111:2222:3333:4444"));
    const b = throttleKey(req("2001:DB8:ABCD:12::1"));
    const c = throttleKey(req("2001:db8:abcd:12:ffff:ffff:ffff:ffff"));
    expect(a).toBe("2001:db8:abcd:12::/64");
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("다른 /64 는 다른 접속자로 센다", () => {
    expect(throttleKey(req("2001:db8:abcd:13::1"))).not.toBe(throttleKey(req("2001:db8:abcd:12::1")));
  });

  it("Cloudflare 를 거친 요청은 CF-Connecting-IP 를 쓰고 그 IPv6 도 /64 로 묶는다", () => {
    const r = { ip: "172.64.1.1", headers: { "cf-connecting-ip": "2001:db8:abcd:12:aaaa:bbbb:cccc:dddd" } };
    expect(throttleKey(r)).toBe("2001:db8:abcd:12::/64");
  });
});

