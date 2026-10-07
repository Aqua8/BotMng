import type { Role } from "./user.entity";

export const JWT_ALGORITHM = "HS256"; // 서명·검증 모두 이것만 허용한다 (라이브러리 기본값에 맡기지 않는다)

export interface TokenPayload {
  sub: number;
  username: string;
  role: Role;
}

/**
 * 토큰이 가리키는 계정이 지금도 그대로인지. 계정이 지워졌거나(서비스 계정을 끈 경우 등),
 * 아이디나 역할이 토큰을 발급한 뒤 바뀌었으면 만료 전이라도 거절한다.
 */
export const isTokenUserCurrent = (payload: TokenPayload, user: { username: string; role: Role } | null): boolean =>
  user !== null && user.username === payload.username && user.role === payload.role;
