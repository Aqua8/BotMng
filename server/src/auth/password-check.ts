import { compare, hashSync } from "bcryptjs";

/** 없는 계정에도 같은 비용의 비교를 하기 위한 가짜 해시 (아무 비밀번호와도 맞지 않는다). 서버가 뜰 때 한 번만 만든다. */
const DUMMY_HASH = hashSync("botmng-dummy-password-for-timing", 10);

/**
 * 비밀번호 확인. 계정이 없거나 쓸 수 없어서 hash 가 없어도 가짜 해시와 똑같이 bcrypt 비교를 해서,
 * 응답 시간 차이로 계정이 있는지 알 수 없게 한다. hash 가 없으면 항상 false.
 */
export async function checkPassword(hash: string | undefined, password: string): Promise<boolean> {
  const matches = await compare(password, hash ?? DUMMY_HASH);
  return hash !== undefined && matches;
}
