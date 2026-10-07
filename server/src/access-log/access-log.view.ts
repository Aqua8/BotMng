import type { Role } from "../auth/user.entity";
import { maskIp } from "./access-log.util";

export type LoginMethod = "password" | "guest" | "session" | "service"; // session = 저장된 로그인으로 화면을 다시 연 경우, service = 외부 서비스 계정의 토큰 발급

/** 같은 계정·IP·브라우저의 성공 기록이 이 시간 안에 있으면 재접속을 다시 기록하지 않는다 */
export const RESUME_DEDUPE_MS = 60 * 60 * 1000;
export type ViewerRole = Role; // admin 이 아니면(guest, service) 가려서 보여준다

/** 이 역할에게 숨길 접속 방식. 서비스 계정의 접속 기록은 관리자에게만 보인다. */
export const hiddenMethods = (role: ViewerRole): LoginMethod[] => (role === "admin" ? [] : ["service"]);

/** access_logs 한 행 (엔티티와 같은 모양. Nest/TypeORM 에 의존하지 않아 단위 테스트가 쉽다) */
export interface AccessLogRow {
  id: number;
  loggedAt: Date;
  username: string;
  success: boolean;
  method: LoginMethod;
  ip: string;
  country: string | null;
  os: string;
  browser: string;
  device: string;
  userAgent: string;
}

export interface AccessLogView extends Omit<AccessLogRow, "username" | "userAgent"> {
  username: string | null;
  userAgent: string | null;
}

/** 역할별로 보여줄 값을 서버에서 가린다. 게스트에게는 원본 IP, User-Agent 원문, 실패한 시도의 아이디를 내려보내지 않는다. */
export function toView(log: AccessLogRow, role: ViewerRole): AccessLogView {
  const { id, loggedAt, success, method, country, os, browser, device } = log;
  if (role === "admin") return { id, loggedAt, username: log.username, success, method, ip: log.ip, country, os, browser, device, userAgent: log.userAgent };
  return { id, loggedAt, username: success ? log.username : null, success, method, ip: maskIp(log.ip), country, os, browser, device, userAgent: null };
}

const ACCESS_SORTS = ["loggedAt", "username", "success", "method", "ip", "country", "os", "browser", "device"] as const;

/** 정렬에 쓸 수 있는 열. 게스트에게는 IP 와 아이디가 가려져 있으므로 이 값으로 정렬하면 순서로 숨긴 값을 유추할 수 있어 막는다. */
export const allowedAccessSorts = (role: ViewerRole): readonly string[] => (role === "admin" ? ACCESS_SORTS : ACCESS_SORTS.filter((c) => c !== "ip" && c !== "username"));
