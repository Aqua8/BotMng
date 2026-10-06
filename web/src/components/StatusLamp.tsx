export type LampStatus = "ok" | "warn" | "err" | "idle";

/** 상태 램프. 색만으로 뜻을 전하지 않도록 옆에 항상 글자를 함께 쓴다 (장식이라 스크린리더에서는 숨김). */
export function StatusLamp({ status }: { status: LampStatus }) {
  return <span className={`lamp ${status === "idle" ? "" : status}`} aria-hidden="true" />;
}
