import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Flex, Text, TextField } from "@radix-ui/themes";

/** 검색 입력 (돋보기 아이콘 포함) */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <TextField.Root className="grow" aria-label={placeholder} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}>
      <TextField.Slot>
        <MagnifyingGlassIcon />
      </TextField.Slot>
    </TextField.Root>
  );
}

/** 라벨이 앞에 붙는 날짜·시각 입력 */
export function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Flex align="center" gap="2">
      <Text as="label" size="2" color="gray">
        {label}
      </Text>
      <TextField.Root type="datetime-local" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
    </Flex>
  );
}
