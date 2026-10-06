import { useEffect, useState } from "react";
import { ConsentModal } from "./ConsentModal";
import { clearConsent, hasConsent, saveConsent } from "./consent";
import { Session, clearSession, getSession, setUnauthorizedHandler } from "./api";
import { AccessLogs } from "./AccessLogs";
import { Dashboard } from "./Dashboard";
import { Login } from "./Login";
import { Logs } from "./Logs";

type Tab = "dashboard" | "logs" | "access";

export function App() {
  const [session, setSession] = useState<Session | null>(getSession);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [consented, setConsented] = useState(hasConsent);
  const [noticeOpen, setNoticeOpen] = useState(() => !hasConsent());

  const logout = () => {
    clearSession();
    setSession(null);
  };
  useEffect(() => setUnauthorizedHandler(logout), []);

  // 열어 둔 채로 24시간이 지나 동의가 만료되면 다시 묻는다.
  useEffect(() => {
    const t = setInterval(() => {
      if (!hasConsent()) {
        setConsented(false);
        setNoticeOpen(true);
      }
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const agree = (remember24h: boolean) => {
    saveConsent(remember24h);
    setConsented(true);
    setNoticeOpen(false);
  };
  // 동의하지 않으면 로그인 상태였더라도 로그아웃하고, 다시 동의할 때까지 로그인할 수 없다.
  const decline = () => {
    clearConsent();
    setConsented(false);
    setNoticeOpen(false);
    if (session) logout();
  };

  const modal = noticeOpen && <ConsentModal onAgree={agree} onDecline={decline} />;

  if (!session) {
    return (
      <>
        <Login onLogin={setSession} consented={consented} onShowNotice={() => setNoticeOpen(true)} />
        {modal}
      </>
    );
  }

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
      {modal}
    </>
  );
}
