import { Flex } from "@radix-ui/themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { Level, LogEntry, LogFilter, Source, fetchLogs, fetchTags, formatStamp, streamLogs } from "./api";
import { LevelBadge } from "./components/Badges";
import { Column, DataTable } from "./components/DataTable";
import { DateTimeField, SearchField } from "./components/Fields";
import { FilterSelect } from "./components/FilterSelect";
import { LiveSwitch } from "./components/LiveSwitch";
import { PageHead } from "./components/PageHead";
import { usePagedList } from "./hooks/usePagedList";

const MAX_ROWS = 2000; // 라이브로 쌓이는 행이 무한정 늘지 않도록 상한을 둔다
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
  { key: "time", header: "시각", className: "nowrap muted", cell: (r) => formatStamp(r.loggedAt) },
  { key: "level", header: "레벨", cell: (r) => <LevelBadge level={r.level} /> },
  { key: "source", header: "파일", className: "nowrap muted", cell: (r) => r.source },
  { key: "tag", header: "태그", className: "nowrap", cell: (r) => (r.tag ? <span className="tag">[{r.tag}]</span> : <span className="muted">-</span>) },
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

  // 검색어는 입력이 멈춘 뒤(300ms) 조회한다. 필터가 바뀌면 새로 고친 줄 강조도 초기화한다.
  const list = usePagedList((before) => fetchLogs(filter, before), [JSON.stringify(filter)], { debounceMs: 300, onReset: () => setFresh(new Set()) });
  const { setRows } = list;

  useEffect(() => {
    fetchTags().then(setTags).catch(() => {});
  }, []);

  const onLive = useCallback(
    (e: LogEntry) => {
      if (!matches(e, filterRef.current)) return;
      setRows((prev) => (prev.some((r) => r.id === e.id) ? prev : [e, ...prev].slice(0, MAX_ROWS)));
      setFresh((prev) => new Set(prev).add(e.id));
    },
    [setRows],
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
        <LiveSwitch checked={live} connected={connected} onChange={setLive} />
      </Flex>
      <Flex wrap="wrap" align="center" gap="4" mb="3">
        <DateTimeField label="시작(KST)" value={from} onChange={setFrom} />
        <DateTimeField label="종료(KST)" value={to} onChange={setTo} />
      </Flex>

      {list.error && <p className="error-text">{list.error}</p>}
      <DataTable
        columns={columns}
        rows={list.rows}
        rowKey={(r) => r.id}
        rowClassName={(r) => [r.level === "error" ? "row-error" : "", fresh.has(r.id) ? "fresh" : ""].filter(Boolean).join(" ") || undefined}
        loading={list.loading}
        hasMore={list.hasMore}
        onLoadMore={list.loadMore}
        emptyText="조건에 맞는 로그가 없습니다."
        minWidth={760}
      />
    </>
  );
}
