import { Badge } from "@radix-ui/themes";

const LEVEL = { info: { color: "gray", text: "info" }, warn: { color: "amber", text: "warn" }, error: { color: "red", text: "error" } } as const;

/** 로그 레벨 배지 */
export function LevelBadge({ level }: { level: keyof typeof LEVEL }) {
  const { color, text } = LEVEL[level];
  return (
    <Badge color={color} variant="soft">
      {text}
    </Badge>
  );
}

/** 로그인 성공/실패 배지 */
export function ResultBadge({ success }: { success: boolean }) {
  return (
    <Badge color={success ? "green" : "red"} variant="soft">
      {success ? "성공" : "실패"}
    </Badge>
  );
}

const OUTCOME = { success: { color: "green", text: "성공" }, failure: { color: "red", text: "실패" }, cancelled: { color: "gray", text: "취소" } } as const;

/** Discord 명령 사용 결과 배지 (성공/실패/취소) */
export function OutcomeBadge({ outcome }: { outcome: keyof typeof OUTCOME }) {
  const { color, text } = OUTCOME[outcome];
  return (
    <Badge color={color} variant="soft">
      {text}
    </Badge>
  );
}
