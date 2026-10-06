import Bowser from "bowser";
import { isIPv4, isIPv6 } from "node:net";

export interface ParsedUserAgent {
  os: string;
  browser: string;
  device: string; // desktop | mobile | tablet | tv | unknown
}

const major = (version?: string) => version?.split(".")[0];

/** User-Agent 에서 OS / 브라우저 / 기기 종류를 뽑는다. 해석할 수 없으면 Unknown. */
export function parseUserAgent(ua?: string): ParsedUserAgent {
  if (!ua) return { os: "Unknown", browser: "Unknown", device: "unknown" };
  const r = Bowser.parse(ua);
  const os = r.os.name ? [r.os.name, r.os.version].filter(Boolean).join(" ") : "Unknown";
  const browser = r.browser.name ? [r.browser.name, major(r.browser.version)].filter(Boolean).join(" ") : "Unknown";
  return { os, browser, device: r.platform.type ?? "unknown" };
}

/** 게스트에게 보여줄 IP. IPv4 는 마지막 옥텟, IPv6 는 앞 3블록만 남기고 가린다. */
export function maskIp(ip: string): string {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  const v4 = mapped ? mapped[1] : ip;
  if (isIPv4(v4)) return v4.split(".").slice(0, 3).join(".") + ".*";
  if (isIPv6(ip)) return expandIPv6(ip).slice(0, 3).join(":") + ":*";
  return "*";
}

/** "2606:4700::1" 같은 축약 표기를 8개 블록으로 펼친다 (앞자리 0 제거 형태). */
function expandIPv6(ip: string): string[] {
  const [head, tail] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const fill = ip.includes("::") ? Array(8 - h.length - t.length).fill("0") : [];
  return [...h, ...fill, ...t].map((g) => g.replace(/^0+(?=.)/, ""));
}
