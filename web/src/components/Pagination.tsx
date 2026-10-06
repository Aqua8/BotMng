import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Button, Flex, IconButton, Select, Text } from "@radix-ui/themes";
import { pageWindow } from "../lib/page-window";

export const PAGE_SIZES = [20, 50, 100];

interface Props {
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}

/** 번호 페이지네이션 + 페이지 크기 선택 + 총 건수 */
export function Pagination({ total, page, pageSize, onPage, onPageSize }: Props) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  return (
    <Flex className="pager" align="center" justify="between" wrap="wrap" gap="3">
      <Text size="2" color="gray">
        총 {total.toLocaleString("ko-KR")}건
      </Text>
      <Flex align="center" gap="3" wrap="wrap">
        <Flex align="center" gap="2">
          <Text size="2" color="gray">
            페이지당
          </Text>
          <Select.Root size="1" value={String(pageSize)} onValueChange={(v) => onPageSize(Number(v))}>
            <Select.Trigger aria-label="페이지당 건수" />
            <Select.Content>
              {PAGE_SIZES.map((n) => (
                <Select.Item key={n} value={String(n)}>
                  {n}건
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
        <Flex align="center" gap="1" asChild>
          <nav aria-label="페이지 이동">
            <IconButton size="1" variant="soft" color="gray" aria-label="이전 페이지" disabled={page <= 1} onClick={() => onPage(page - 1)}>
              <ChevronLeftIcon />
            </IconButton>
            {pageWindow(page, last).map((n, i) =>
              n === "…" ? (
                <Text key={`gap-${i}`} size="2" color="gray" className="pager-gap">
                  …
                </Text>
              ) : (
                <Button key={n} size="1" variant={n === page ? "solid" : "soft"} color={n === page ? undefined : "gray"} aria-current={n === page ? "page" : undefined} aria-label={`${n}페이지`} onClick={() => onPage(n)}>
                  {n}
                </Button>
              ),
            )}
            <IconButton size="1" variant="soft" color="gray" aria-label="다음 페이지" disabled={page >= last} onClick={() => onPage(page + 1)}>
              <ChevronRightIcon />
            </IconButton>
          </nav>
        </Flex>
      </Flex>
    </Flex>
  );
}
