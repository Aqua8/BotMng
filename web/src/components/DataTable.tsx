import { ArrowDownIcon, ArrowUpIcon, CaretSortIcon } from "@radix-ui/react-icons";
import { Spinner, Table } from "@radix-ui/themes";
import { ReactNode } from "react";
import { SortOrder } from "../api";
import { Pagination } from "./Pagination";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** 셀에 붙일 클래스 (예: 한 줄 고정폭, 줄바꿈 허용) */
  className?: string;
  /** 지정하면 머리글을 눌러 이 이름으로 정렬한다 (서버가 허용한 열 이름). 없으면 정렬할 수 없는 열 */
  sortKey?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  rowClassName?: (row: T) => string | undefined;
  rowTitle?: (row: T) => string | undefined;
  loading?: boolean;
  emptyText: string;
  /** 이보다 좁아지면 가로로 스크롤한다 */
  minWidth?: number;
  /** 현재 정렬(기본 정렬도 포함해서 넘긴다)과 머리글을 눌렀을 때 */
  sort?: { key: string; order: SortOrder };
  onSort?: (sortKey: string) => void;
  pagination: { total: number; page: number; pageSize: number; onPage: (p: number) => void; onPageSize: (n: number) => void };
}

/** 열 정의와 행 데이터만 받는 테이블. 정렬 머리글, 번호 페이지네이션, 빈 상태, 로딩, 가로 스크롤을 함께 처리한다. */
export function DataTable<T>({ columns, rows, rowKey, rowClassName, rowTitle, loading, emptyText, minWidth = 720, sort, onSort, pagination }: Props<T>) {
  return (
    <div>
      <div className="table-wrap">
        <Table.Root variant="surface" size="1" style={{ minWidth }}>
          <Table.Header>
            <Table.Row>
              {columns.map((c) => {
                const active = !!c.sortKey && sort?.key === c.sortKey;
                return (
                  <Table.ColumnHeaderCell key={c.key} aria-sort={!c.sortKey ? undefined : active ? (sort!.order === "asc" ? "ascending" : "descending") : "none"}>
                    {c.sortKey && onSort ? (
                      <button type="button" className={`th-sort${active ? " active" : ""}`} onClick={() => onSort(c.sortKey!)}>
                        {c.header}
                        {active ? sort!.order === "asc" ? <ArrowUpIcon /> : <ArrowDownIcon /> : <CaretSortIcon className="idle-icon" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </Table.ColumnHeaderCell>
                );
              })}
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
        {loading && (
          <p className="table-note muted">
            <Spinner size="1" /> 불러오는 중...
          </p>
        )}
      </div>
      <Pagination {...pagination} />
    </div>
  );
}
