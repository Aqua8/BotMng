export type RangePreset = "1h" | "today" | "24h" | "7d" | "clear";

const HOUR_MS = 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * HOUR_MS; // 한국은 서머타임이 없어 고정 오프셋으로 충분하다.

/** 시각을 한국 시간 기준 `datetime-local` 입력 형식(YYYY-MM-DDTHH:mm)으로 바꾼다. */
const toKstLocal = (d: Date) => new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 16);

/**
 * 빠른 기간 선택 값. 시작만 채우고 끝은 비워 두어 지금 쌓이는 로그도 포함한다.
 * 모든 값은 한국 시간(KST) 기준이다 (입력창도 KST 로 해석한다).
 */
export function rangeFor(preset: RangePreset, now: Date = new Date()): { from: string; to: string } {
  switch (preset) {
    case "1h":
      return { from: toKstLocal(new Date(now.getTime() - HOUR_MS)), to: "" };
    case "24h":
      return { from: toKstLocal(new Date(now.getTime() - 24 * HOUR_MS)), to: "" };
    case "7d":
      return { from: toKstLocal(new Date(now.getTime() - 7 * 24 * HOUR_MS)), to: "" };
    case "today":
      return { from: `${toKstLocal(now).slice(0, 10)}T00:00`, to: "" };
    case "clear":
      return { from: "", to: "" };
  }
}
