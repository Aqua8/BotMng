import { SetMetadata } from "@nestjs/common";
import { ALLOW_SERVICE } from "./role-access";

/** 이 핸들러는 서비스 계정(service)의 토큰으로도 호출할 수 있다. 붙이지 않은 API 는 서비스 계정이 호출하면 403. */
export const AllowService = () => SetMetadata(ALLOW_SERVICE, true);
