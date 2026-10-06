import { useEffect, useState } from "react";
import { AccessLogEntry, AccessLogFilter, fetchAccessLogs, formatStamp, getSession } from "./api";

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
      <div className="page-head">
        <h1>접속 로그</h1>
        <p className="lede">
          {isAdmin
            ? "로그인 시도(성공과 실패)를 최신순으로 보여줍니다. 관리자에게는 모든 정보가 표시됩니다."
            : "로그인 시도(성공과 실패)를 최신순으로 보여줍니다. IP는 앞 두 칸만, 실패한 시도의 아이디는 가려서 표시됩니다."}
        </p>
      </div>

      <div className="toolbar">
        <select aria-label="결과" value={success} onChange={(e) => setSuccess(e.target.value)}>
          <option value="">전체 결과</option>
          <option value="true">성공</option>
          <option value="false">실패</option>
        </select>
        <select aria-label="방식" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">전체 방식</option>
          <option value="password">아이디/비밀번호</option>
          <option value="guest">게스트 버튼</option>
        </select>
        <button onClick={() => void load()} disabled={loading}>
          새로고침
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="table-wrap">
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
                <td className="time">{formatStamp(r.loggedAt)}</td>
                <td>{r.username ?? <span className="muted">(가림)</span>}</td>
                <td>
                  <span className="result">
                    <span className={`lamp ${r.success ? "ok" : "err"}`} aria-hidden="true" />
                    {r.success ? "성공" : "실패"}
                  </span>
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
        {rows.length === 0 && !loading && <p className="empty" style={{ padding: "14px 16px" }}>접속 기록이 없습니다.</p>}
        {(cursor !== null || loading) && (
          <div className="stream-foot">{loading ? <span className="muted">불러오는 중...</span> : <button onClick={() => void load(cursor!)}>더 보기</button>}</div>
        )}
      </div>
    </>
  );
}
