import { Button, Spinner, Table } from "@radix-ui/themes";
import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** 셀에 붙일 클래스 (예: 한 줄 고정폭, 줄바꿈 허용) */
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  rowClassName?: (row: T) => string | undefined;
  rowTitle?: (row: T) => string | undefined;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyText: string;
  /** 이보다 좁아지면 가로로 스크롤한다 */
  minWidth?: number;
}

/** 열 정의와 행 데이터만 받는 테이블. 빈 상태, 로딩, "더 보기", 가로 스크롤을 함께 처리한다. */
export function DataTable<T>({ columns, rows, rowKey, rowClassName, rowTitle, loading, hasMore, onLoadMore, emptyText, minWidth = 720 }: Props<T>) {
  return (
    <div className="table-wrap">
      <Table.Root variant="surface" size="1" style={{ minWidth }}>
        <Table.Header>
          <Table.Row>
            {columns.map((c) => (
              <Table.ColumnHeaderCell key={c.key}>{c.header}</Table.ColumnHeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((r) => (
            <Table.Row key={rowKey(r)} className={rowClassName?.(r)} title={rowTitle?.(r)}>
              {columns.map((c) => (
                <Table.Cell key={c.key} className={c.className}>
                  {c.cell(r)}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      {rows.length === 0 && !loading && <p className="empty table-note">{emptyText}</p>}
      {(hasMore || loading) && (
        <div className="table-note">
          {loading ? (
            <span className="muted">
              <Spinner size="1" /> 불러오는 중...
            </span>
          ) : (
            <Button variant="soft" color="gray" onClick={onLoadMore}>
              더 보기
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
