import { Button, Flex } from "@radix-ui/themes";
import { AccessLogEntry, AccessLogFilter, fetchAccessLogs, formatStamp, getSession } from "./api";
import { ResultBadge } from "./components/Badges";
import { Column, DataTable } from "./components/DataTable";
import { FilterSelect } from "./components/FilterSelect";
import { PageHead } from "./components/PageHead";
import { DEFAULT_SORT, nextSort, useTableQuery } from "./hooks/useTableQuery";
import { useState } from "react";

const METHOD: Record<string, string> = { password: "비밀번호", guest: "게스트 버튼", session: "저장된 로그인" };
const DEVICE: Record<string, string> = { desktop: "PC", mobile: "모바일", tablet: "태블릿", tv: "TV", unknown: "알 수 없음" };

/** 게스트에게는 IP와 계정이 가려져 있으므로 이 두 열은 정렬할 수 없다 (서버도 400으로 거부한다). */
const buildColumns = (isAdmin: boolean): Column<AccessLogEntry>[] => [
  { key: "time", header: "시각", sortKey: "loggedAt", className: "nowrap muted", cell: (r) => formatStamp(r.loggedAt) },
  { key: "user", header: "계정", sortKey: isAdmin ? "username" : undefined, cell: (r) => r.username ?? <span className="muted">(가림)</span> },
  { key: "result", header: "결과", sortKey: "success", cell: (r) => <ResultBadge success={r.success} /> },
  { key: "method", header: "방식", sortKey: "method", className: "nowrap", cell: (r) => METHOD[r.method] ?? r.method },
  { key: "ip", header: "IP", sortKey: isAdmin ? "ip" : undefined, className: "mono nowrap", cell: (r) => r.ip },
  { key: "country", header: "국가", sortKey: "country", cell: (r) => r.country ?? "-" },
  { key: "os", header: "OS", sortKey: "os", className: "nowrap", cell: (r) => r.os },
  { key: "browser", header: "브라우저", sortKey: "browser", className: "nowrap", cell: (r) => r.browser },
  { key: "device", header: "기기", sortKey: "device", className: "nowrap", cell: (r) => DEVICE[r.device] ?? r.device },
];

export function AccessLogs() {
  const [success, setSuccess] = useState("");
  const [method, setMethod] = useState("");
  const isAdmin = getSession()?.role === "admin";

  const filter: AccessLogFilter = {
    success: success === "" ? undefined : success === "true",
    method: (method || undefined) as AccessLogFilter["method"],
  };
  const tq = useTableQuery((query) => fetchAccessLogs(filter, query), `${success}|${method}`);
  const columns = buildColumns(isAdmin);

  return (
    <>
      <PageHead
        title="접속 로그"
        lede={
          isAdmin
            ? "로그인 시도(성공과 실패)를 최신순으로 보여줍니다. 관리자에게는 모든 정보가 표시됩니다."
            : "로그인 시도(성공과 실패)를 최신순으로 보여줍니다. IP는 앞 두 칸만, 실패한 시도의 아이디는 가려서 표시됩니다."
        }
      />

      <Flex wrap="wrap" align="center" gap="2" mb="3">
        <FilterSelect label="결과" allLabel="전체 결과" value={success} onChange={setSuccess} options={[{ value: "true", label: "성공" }, { value: "false", label: "실패" }]} />
        <FilterSelect label="방식" allLabel="전체 방식" value={method} onChange={setMethod} options={[{ value: "password", label: "아이디/비밀번호" }, { value: "guest", label: "게스트 버튼" }, { value: "session", label: "저장된 로그인" }]} />
        <Button variant="soft" color="gray" onClick={tq.reload} disabled={tq.loading}>
          새로고침
        </Button>
      </Flex>

      {tq.error && <p className="error-text">{tq.error}</p>}
      <DataTable
        columns={columns}
        rows={tq.rows}
        rowKey={(r) => r.id}
        rowTitle={(r) => r.userAgent ?? undefined}
        loading={tq.loading}
        emptyText="접속 기록이 없습니다."
        minWidth={820}
        sort={tq.sort ?? DEFAULT_SORT}
        onSort={(key) => tq.setSort(nextSort(tq.sort, key))}
        pagination={{ total: tq.total, page: tq.page, pageSize: tq.pageSize, onPage: tq.setPage, onPageSize: tq.setPageSize }}
      />
    </>
  );
}
