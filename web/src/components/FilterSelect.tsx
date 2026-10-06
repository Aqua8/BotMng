import { Select } from "@radix-ui/themes";

// Radix Select 는 빈 문자열을 항목 값으로 쓸 수 없어서 "전체"를 별도 값으로 두고 바깥에는 빈 문자열로 돌려준다.
const ALL = "__all__";

export interface FilterOption {
  value: string;
  label: string;
}

/** "전체" 선택지가 있는 필터용 셀렉트. value 가 "" 이면 전체. */
export function FilterSelect({ label, allLabel, value, onChange, options }: { label: string; allLabel: string; value: string; onChange: (v: string) => void; options: FilterOption[] }) {
  return (
    <Select.Root value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <Select.Trigger aria-label={label} />
      <Select.Content>
        <Select.Item value={ALL}>{allLabel}</Select.Item>
        {options.map((o) => (
          <Select.Item key={o.value} value={o.value}>
            {o.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
