import { useEffect, useState } from "react";
import { AccessLogEntry, AccessLogFilter, fetchAccessLogs, formatTime, getSession } from "./api";

const DEVICE: Record<string, string> = { desktop: "PC", mobile: "모바일", tablet: "태블릿", tv: "TV", unknown: "알 수 없음" };

export function AccessLogs() {
  const [success, setSuccess] = useState("");
  const [method, setMethod] = useState("");
  const [rows, setRows] = useState<AccessLogEntry[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = getSession()?.role === "admin";

  const filter: AccessLogFilter = {
    success: success === "" ? undefined : success === "true",
    method: (method || undefined) as AccessLogFilter["method"],
  };

  const load = async (before?: number) => {
    setLoading(true);
    try {
      const r = await fetchAccessLogs(filter, before);
      setRows((prev) => (before ? [...prev, ...r.items] : r.items));
      setCursor(r.nextCursor);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [success, method]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="filters card">
        <select value={success} onChange={(e) => setSuccess(e.target.value)}>
          <option value="">전체 결과</option>
          <option value="true">성공</option>
          <option value="false">실패</option>
        </select>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">전체 방식</option>
          <option value="password">아이디/비밀번호</option>
          <option value="guest">게스트 버튼</option>
        </select>
        <button onClick={() => void load()} disabled={loading}>
          새로고침
        </button>
        <span className="muted">
          {isAdmin ? "관리자: 모든 정보가 표시됩니다" : "게스트: IP 일부와 실패한 시도의 아이디는 가려집니다"}
        </span>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card table-wrap">
        <table className="access">
          <thead>
            <tr>
              <th>시각</th>
              <th>계정</th>
              <th>결과</th>
              <th>방식</th>
              <th>IP</th>
              <th>국가</th>
              <th>OS</th>
              <th>브라우저</th>
              <th>기기</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} title={r.userAgent ?? undefined}>
                <td className="time">{formatTime(r.loggedAt)}</td>
                <td>{r.username ?? <span className="muted">(가림)</span>}</td>
                <td>
                  <span className={`badge ${r.success ? "info" : "error"}`}>{r.success ? "성공" : "실패"}</span>
                </td>
                <td>{r.method === "guest" ? "게스트 버튼" : "비밀번호"}</td>
                <td className="mono">{r.ip}</td>
                <td>{r.country ?? "-"}</td>
                <td>{r.os}</td>
                <td>{r.browser}</td>
                <td>{DEVICE[r.device] ?? r.device}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading && <p className="muted">접속 기록이 없습니다</p>}
        {cursor !== null && (
          <button onClick={() => void load(cursor)} disabled={loading}>
            더 보기
          </button>
        )}
        {loading && <p className="muted">불러오는 중...</p>}
      </div>
    </>
  );
}
