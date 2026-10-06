import { Flex } from "@radix-ui/themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { Level, LogEntry, LogFilter, Source, fetchLogs, fetchTags, formatStamp, streamLogs } from "./api";
import { LevelBadge, OutcomeBadge } from "./components/Badges";
import { Column, DataTable } from "./components/DataTable";
import { DateTimeField, SearchField } from "./components/Fields";
import { FilterSelect } from "./components/FilterSelect";
import { LiveSwitch } from "./components/LiveSwitch";
import { PageHead } from "./components/PageHead";
import { formatDuration } from "./lib/format-duration";
import { DEFAULT_SORT, nextSort, useTableQuery } from "./hooks/useTableQuery";

const toIso = (local: string) => (local ? new Date(`${local}:00+09:00`).toISOString() : undefined); // 입력값은 KST로 해석

function matches(e: LogEntry, f: LogFilter) {
  return (
    (!f.source || e.source === f.source) &&
    (!f.level || e.level === f.level) &&
    (!f.tag || e.tag === f.tag) &&
    (!f.q || e.message.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.from || e.loggedAt >= f.from) &&
    (!f.to || e.loggedAt <= f.to)
  );
}

/** 태그는 별도 열에 보여주므로 메시지 앞의 "[태그] "는 뺀다. */
const bodyOf = (r: LogEntry) => (r.tag && r.message.startsWith(`[${r.tag}]`) ? r.message.slice(r.tag.length + 2).trimStart() : r.message);

const columns: Column<LogEntry>[] = [
  { key: "time", header: "시각", sortKey: "loggedAt", className: "nowrap muted", cell: (r) => formatStamp(r.loggedAt) },
  { key: "level", header: "레벨", sortKey: "level", cell: (r) => <LevelBadge level={r.level} /> },
  { key: "source", header: "파일", sortKey: "source", className: "nowrap muted", cell: (r) => r.source },
  { key: "tag", header: "태그", sortKey: "tag", className: "nowrap", cell: (r) => (r.tag ? <span className="tag">[{r.tag}]</span> : <span className="muted">-</span>) },
  { key: "outcome", header: "결과", sortKey: "outcome", cell: (r) => (r.outcome ? <OutcomeBadge outcome={r.outcome} /> : <span className="muted">-</span>) },
  { key: "duration", header: "처리시간", sortKey: "durationMs", className: "nowrap", cell: (r) => (r.durationMs === null ? <span className="muted">-</span> : formatDuration(r.durationMs)) },
  { key: "msg", header: "메시지", cell: (r) => <pre className="msg">{bodyOf(r)}</pre> },
];

export function Logs() {
  const [source, setSource] = useState("");
  const [level, setLevel] = useState("");
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const [live, setLive] = useState(true);
  const [autoOff, setAutoOff] = useState(false); // 페이지·정렬을 바꿔서 실시간이 자동으로 꺼졌는지
  const [connected, setConnected] = useState(false);

  const filter: LogFilter = {
    source: (source || undefined) as Source | undefined,
    level: (level || undefined) as Level | undefined,
    tag: tag || undefined,
    q: q || undefined,
    from: toIso(from),
    to: toIso(to),
  };
  const filterRef = useRef(filter);
  filterRef.current = filter;

  // 검색어는 입력이 멈춘 뒤(300ms) 조회한다. 필터가 바뀌면 1페이지로 돌아가고 새로 고친 줄 강조도 초기화한다.
  const tq = useTableQuery((query) => fetchLogs(filter, query), JSON.stringify(filter), { debounceMs: 300, onReset: () => setFresh(new Set()) });
  const { setRows, setTotal, pageSize, atHome } = tq;

  useEffect(() => {
    fetchTags().then(setTags).catch(() => {});
  }, []);

  // 실시간 새 로그는 최신순 1페이지에만 자연스럽게 들어간다. 페이지나 정렬을 바꾸면 실시간을 끈다.
  useEffect(() => {
    if (live && !atHome) {
      setLive(false);
      setAutoOff(true);
    }
  }, [live, atHome]);

  const toggleLive = (on: boolean) => {
    setAutoOff(false);
    if (on) tq.resetView(); // 다시 켜면 1페이지·기본 정렬로 돌아간다
    setLive(on);
  };

  const onLive = useCallback(
    (e: LogEntry) => {
      if (!matches(e, filterRef.current)) return;
      setRows((prev) => (prev.some((r) => r.id === e.id) ? prev : [e, ...prev].slice(0, pageSize)));
      setTotal((t) => t + 1);
      setFresh((prev) => new Set(prev).add(e.id));
    },
    [setRows, setTotal, pageSize],
  );

  useEffect(() => {
    if (!live) {
      setConnected(false);
      return;
    }
    return streamLogs(onLive, setConnected);
  }, [live, onLive]);

  return (
    <>
      <PageHead title="로그" lede="봇이 남긴 out.log와 error.log를 최신순으로 보여줍니다." />

      <Flex wrap="wrap" align="center" gap="2" mb="3">
        <FilterSelect label="로그 파일" allLabel="전체 파일" value={source} onChange={setSource} options={[{ value: "out", label: "out.log" }, { value: "error", label: "error.log" }]} />
        <FilterSelect label="레벨" allLabel="전체 레벨" value={level} onChange={setLevel} options={["info", "warn", "error"].map((v) => ({ value: v, label: v }))} />
        <FilterSelect label="태그" allLabel="전체 태그" value={tag} onChange={setTag} options={tags.map((t) => ({ value: t, label: `[${t}]` }))} />
        <SearchField value={q} onChange={setQ} placeholder="메시지 검색" />
        <LiveSwitch checked={live} connected={connected} onChange={toggleLive} />
        {autoOff && <span className="muted note">페이지·정렬을 바꿔서 실시간이 꺼졌습니다</span>}
      </Flex>
      <Flex wrap="wrap" align="center" gap="4" mb="3">
        <DateTimeField label="시작(KST)" value={from} onChange={setFrom} />
        <DateTimeField label="종료(KST)" value={to} onChange={setTo} />
      </Flex>

      {tq.error && <p className="error-text">{tq.error}</p>}
      <DataTable
        columns={columns}
        rows={tq.rows}
        rowKey={(r) => r.id}
        rowClassName={(r) => [r.level === "error" ? "row-error" : "", fresh.has(r.id) ? "fresh" : ""].filter(Boolean).join(" ") || undefined}
        loading={tq.loading}
        emptyText="조건에 맞는 로그가 없습니다."
        minWidth={900}
        sort={tq.sort ?? DEFAULT_SORT}
        onSort={(key) => tq.setSort(nextSort(tq.sort, key))}
        pagination={{ total: tq.total, page: tq.page, pageSize: tq.pageSize, onPage: tq.setPage, onPageSize: tq.setPageSize }}
      />
    </>
  );
}
