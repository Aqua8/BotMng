import { SetMetadata } from "@nestjs/common";
import { ALLOW_SERVICE, ALLOW_WHEN_DB_DOWN } from "./role-access";

/** 이 핸들러는 서비스 계정(service)의 토큰으로도 호출할 수 있다. 붙이지 않은 API 는 서비스 계정이 호출하면 403. */
export const AllowService = () => SetMetadata(ALLOW_SERVICE, true);

/** DB 가 죽어도 토큰 내용만으로 호출을 허용한다. 상태 API 가 "DB 연결 오류"를 알려 주려면 필요하다. 다른 API 는 DB 를 못 읽으면 503. */
export const AllowWhenDbDown = () => SetMetadata(ALLOW_WHEN_DB_DOWN, true);
