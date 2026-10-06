import { maskIp, parseUserAgent } from "./access-log.util";

describe("parseUserAgent", () => {
  it("맥 크롬(데스크톱)", () => {
    const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";
    expect(parseUserAgent(ua)).toEqual({ os: "macOS 10.15.7", browser: "Chrome 154", device: "desktop" });
  });

  it("아이폰 사파리(모바일)", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
    expect(parseUserAgent(ua)).toEqual({ os: "iOS 18.0", browser: "Safari 18", device: "mobile" });
  });

  it("윈도우 엣지", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0";
    const r = parseUserAgent(ua);
    expect(r.os).toBe("Windows 10/11"); // Windows 10 과 11 은 User-Agent 로 구분되지 않는다
    expect(r.browser).toBe("Microsoft Edge 130");
    expect(r.device).toBe("desktop");
  });

  it("알 수 없거나 비어 있으면 Unknown", () => {
    expect(parseUserAgent("curl/8.7.1")).toMatchObject({ device: "unknown" });
    expect(parseUserAgent(undefined)).toEqual({ os: "Unknown", browser: "Unknown", device: "unknown" });
    expect(parseUserAgent("")).toEqual({ os: "Unknown", browser: "Unknown", device: "unknown" });
  });
});

describe("maskIp", () => {
  it("IPv4는 앞 두 칸만 남기고 나머지 칸을 ***로 가린다", () => {
    expect(maskIp("203.0.113.42")).toBe("203.0.***.***");
    expect(maskIp("198.51.100.77")).toBe("198.51.***.***");
  });

  it("IPv6는 앞 두 블록만 남기고 나머지 6블록을 ****로 가린다", () => {
    expect(maskIp("2001:db8:abcd:1234:5678:9abc:def0:1")).toBe("2001:db8:****:****:****:****:****:****");
    expect(maskIp("2606:4700::1")).toBe("2606:4700:****:****:****:****:****:****");
  });

  it("IPv4-mapped IPv6는 IPv4로 보고 가린다", () => {
    expect(maskIp("::ffff:203.0.113.42")).toBe("203.0.***.***");
  });

  it("알 수 없는 형식은 통째로 가린다", () => {
    expect(maskIp("")).toBe("*");
    expect(maskIp("weird")).toBe("*");
  });
});
