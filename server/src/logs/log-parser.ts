export type LogSource = "out" | "error";
export type LogLevel = "info" | "warn" | "error";

export interface ParsedLog {
  source: LogSource;
  level: LogLevel;
  tag: string | null;
  message: string;
  loggedAt: Date;
  fileOffset: number;
}

// ScheduleAlertBot의 src/logger.ts가 만드는 형식: "<ISO시각(Z 또는 +09:00)> <INFO|WARN|ERROR> <메시지>"
const LINE = /^(\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})) (INFO|WARN|ERROR) (.*)$/;
const TAG = /^\[([^\]]+)\]/;

function newEntry(source: LogSource, line: string, fileOffset: number, fallback: Date): ParsedLog {
  const m = LINE.exec(line);
  if (m) {
    return {
      source,
      level: m[2].toLowerCase() as LogLevel,
      tag: TAG.exec(m[3])?.[1] ?? null,
      message: m[3],
      loggedAt: new Date(m[1]),
      fileOffset,
    };
  }
  // 타임스탬프 도입 이전의 레거시 줄
  return {
    source,
    level: line.startsWith("(node:") ? "warn" : source === "error" ? "error" : "info",
    tag: TAG.exec(line)?.[1] ?? null,
    message: line,
    loggedAt: fallback,
    fileOffset,
  };
}

/** 개행으로 끝나는 완전한 줄들의 텍스트를 항목 목록으로 변환한다. baseOffset은 text 시작의 파일 내 바이트 위치. */
export function parseChunk(source: LogSource, text: string, baseOffset: number, fallback: Date): ParsedLog[] {
  const entries: ParsedLog[] = [];
  let offset = baseOffset;
  let acceptsContinuation = false;
  for (const line of text.split("\n")) {
    const lineOffset = offset;
    offset += Buffer.byteLength(line) + 1;
    if (line.trim() === "") continue;
    const prev = entries[entries.length - 1];
    // 연속 줄 병합은 타임스탬프 항목과 (node: 경고 뒤에서만 한다 (레거시 줄은 줄마다 독립 항목)
    if (prev && acceptsContinuation && !LINE.test(line) && !line.startsWith("(node:")) {
      prev.message += "\n" + line; // 스택트레이스 등 연속 줄
    } else {
      entries.push(newEntry(source, line, lineOffset, fallback));
      acceptsContinuation = LINE.test(line) || line.startsWith("(node:");
    }
  }
  return entries;
}
