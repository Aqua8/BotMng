/** 시드 비밀번호 정책. Nest 에 의존하지 않는 순수 함수라 단위 테스트가 쉽다. */

export const MIN_PASSWORD_LENGTH = 12;
export const MIN_DISTINCT_CHARS = 6; // 111111111111, aaaaaaaaaaaa 같은 값을 막는다
/** bcrypt 는 72바이트 이후를 잘라서 비교한다. 그보다 길게 정하면 실제 강도가 입력한 것과 달라진다 */
export const MAX_PASSWORD_BYTES = 72;

/**
 * .env 의 계정 비밀번호가 정책을 지키는지 점검하고 문제 목록을 돌려준다. 문제가 없으면 빈 배열.
 * 비어 있거나 없는 값은 건너뛴다(필수 여부는 호출한 쪽이 따로 확인한다). 결과 문구에 비밀번호 값은 넣지 않는다.
 * 공백으로 이루어진 값은 "없음"이 아니라 약한 값으로 본다.
 */
export function checkSeedPasswords(passwords: Record<string, string | undefined>): string[] {
  const problems: string[] = [];
  const present = Object.entries(passwords).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== "");

  for (const [name, value] of present) {
    if (value.length < MIN_PASSWORD_LENGTH) problems.push(`${name}: ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다 (현재 ${value.length}자)`);
    if (value !== value.trim()) problems.push(`${name}: 앞뒤에 공백이 있습니다`);
    if (new Set(value).size < MIN_DISTINCT_CHARS) problems.push(`${name}: 서로 다른 문자가 ${MIN_DISTINCT_CHARS}개 이상이어야 합니다`);
    if (Buffer.byteLength(value) > MAX_PASSWORD_BYTES) problems.push(`${name}: ${MAX_PASSWORD_BYTES}바이트 이하여야 합니다 (그 뒤는 잘려서 비교됩니다)`);
  }

  // 계정끼리 같은 값을 쓰면 하나가 알려질 때 다른 계정(관리자)까지 뚫린다
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      if (present[i][1] === present[j][1]) problems.push(`${present[i][0]}와 ${present[j][0]}가 같은 값입니다 (계정마다 달라야 합니다)`);
    }
  }
  return problems;
}

/** 시작을 거부할 때 보여 주는 안내. 문제 목록만 담고 비밀번호 값은 담지 않는다. */
export function passwordPolicyMessage(problems: string[]): string {
  return (
    "비밀번호 설정이 안전하지 않아 서버를 시작하지 않습니다.\n" +
    problems.map((p) => `- ${p}`).join("\n") +
    `\n계정마다 서로 다른 ${MIN_PASSWORD_LENGTH}자 이상 무작위 값을 쓰세요 (예: openssl rand -base64 24). .env 값에 # 이 들어 있으면 큰따옴표로 감싸세요.`
  );
}
