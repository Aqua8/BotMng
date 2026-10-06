import { SegmentedControl } from "@radix-ui/themes";

export const PERIODS = [
  { days: 1, label: "24시간" },
  { days: 7, label: "7일" },
  { days: 30, label: "30일" },
];

/** 통계 기간(24시간/7일/30일) 선택. 서버의 `days=1|7|30` 값과 같다. */
export function PeriodSelect({ days, onChange }: { days: number; onChange: (days: number) => void }) {
  return (
    <SegmentedControl.Root size="1" value={String(days)} onValueChange={(v) => onChange(Number(v))} aria-label="통계 기간">
      {PERIODS.map((p) => (
        <SegmentedControl.Item key={p.days} value={String(p.days)}>
          {p.label}
        </SegmentedControl.Item>
      ))}
    </SegmentedControl.Root>
  );
}
