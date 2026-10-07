import type { Role } from "./user.entity";

export const ALLOW_SERVICE = "allowService";

/** 서비스 계정은 @AllowService() 가 붙은 API 만 쓸 수 있고, 관리자·게스트는 기존대로 모두 쓴다. */
export const isRoleAllowed = (role: Role, allowService: boolean): boolean => role !== "service" || allowService;
