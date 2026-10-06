/** 로그 CSV 내보내기용 순수 함수. Nest 에 의존하지 않아 단위 테스트가 쉽다. */

const HEADER = ["시각(KST)", "레벨", "파일", "태그", "결과", "처리시간(ms)", "메시지"];
const OUTCOME_LABEL: Record<string, string> = { success: "성공", failure: "실패", cancelled: "취소" };
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * CSV 셀 하나. 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싼다.
 * **CSV 인젝션 방지**: 문자열이 `= + - @` 나 탭·CR 로 시작하면 Excel 등이 수식으로 실행할 수 있어 앞에 `'` 를 붙인다.
 * 숫자는 수식이 될 수 없으므로 그대로 둔다 (음수 포함).
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value).replace(/\r\n?/g, "\n");
  // 줄바꿈을 통일하기 전의 원본으로 검사한다 (CR 로 시작하는 셀도 위험하다).
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(value)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** UTC 시각을 한국 시간 `YYYY-MM-DD HH:mm:ss` 로 */
export const formatKst = (d: Date) => new Date(d.getTime() + KST_OFFSET_MS).toISOString().replace("T", " ").slice(0, 19);

export interface CsvLogRow {
  loggedAt: Date;
  level: string;
  source: string;
  tag: string | null;
  outcome: string | null;
  durationMs: number | null;
  message: string;
}

export function toCsv(rows: CsvLogRow[]): string {
  const lines = rows.map((r) =>
    [formatKst(r.loggedAt), r.level, `${r.source}.log`, r.tag, r.outcome ? (OUTCOME_LABEL[r.outcome] ?? r.outcome) : null, r.durationMs, r.message].map(csvCell).join(","),
  );
  return [HEADER.join(","), ...lines].join("\n") + "\n";
}

/** 한도를 넘으면 한도까지만 남기고 잘렸음을 알린다. */
export function capRows<T>(rows: T[], max: number): { rows: T[]; truncated: boolean } {
  return rows.length > max ? { rows: rows.slice(0, max), truncated: true } : { rows, truncated: false };
}
