import { Button, Flex } from "@radix-ui/themes";
import { RangePreset, rangeFor } from "../lib/quick-range";

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "1h", label: "최근 1시간" },
  { id: "today", label: "오늘" },
  { id: "24h", label: "최근 24시간" },
  { id: "7d", label: "7일" },
  { id: "clear", label: "해제" },
];

/** 기간을 자주 쓰는 값으로 한 번에 채우는 버튼들. 값은 한국 시간(KST) 기준이고 시작 시각만 채운다. */
export function QuickRange({ onPick }: { onPick: (range: { from: string; to: string }) => void }) {
  return (
    <Flex gap="1" wrap="wrap" role="group" aria-label="빠른 기간 선택">
      {PRESETS.map((p) => (
        <Button key={p.id} size="1" variant="soft" color="gray" onClick={() => onPick(rangeFor(p.id))}>
          {p.label}
        </Button>
      ))}
    </Flex>
  );
}
