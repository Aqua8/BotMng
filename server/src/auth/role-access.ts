import type { Role } from "./user.entity";

export const ALLOW_SERVICE = "allowService";
export const ALLOW_WHEN_DB_DOWN = "allowWhenDbDown";

/** 서비스 계정은 @AllowService() 가 붙은 API 만 쓸 수 있고, 관리자·게스트는 기존대로 모두 쓴다. */
export const isRoleAllowed = (role: Role, allowService: boolean): boolean => role !== "service" || allowService;

/** 계정을 DB 로 확인하지 못한 토큰(dbUnavailable)은 @AllowWhenDbDown() 이 붙은 핸들러에서만 쓸 수 있다. */
export const isDbCheckSatisfied = (dbUnavailable: boolean | undefined, allowWhenDbDown: boolean): boolean => !dbUnavailable || allowWhenDbDown;
