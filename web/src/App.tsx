import { useEffect, useState } from "react";
import { Session, clearSession, getSession, setUnauthorizedHandler } from "./api";
import { AccessLogs } from "./AccessLogs";
import { Dashboard } from "./Dashboard";
import { Login } from "./Login";
import { Logs } from "./Logs";

type Tab = "dashboard" | "logs" | "access";

export function App() {
  const [session, setSession] = useState<Session | null>(getSession);
  const [tab, setTab] = useState<Tab>("dashboard");

  const logout = () => {
    clearSession();
    setSession(null);
  };
  useEffect(() => setUnauthorizedHandler(logout), []);

  if (!session) return <Login onLogin={setSession} />;

  return (
    <>
      <header>
        <strong>BotMng</strong>
        <nav>
          <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>
            대시보드
          </button>
          <button className={tab === "logs" ? "active" : ""} onClick={() => setTab("logs")}>
            로그
          </button>
          <button className={tab === "access" ? "active" : ""} onClick={() => setTab("access")}>
            접속 로그
          </button>
        </nav>
        <span className="spacer" />
        <span className="muted">
          {session.username} ({session.role === "admin" ? "관리자" : "게스트"})
        </span>
        <button onClick={logout}>로그아웃</button>
      </header>
      <main>{tab === "dashboard" ? <Dashboard /> : tab === "logs" ? <Logs /> : <AccessLogs />}</main>
    </>
  );
}
