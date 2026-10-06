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

  const items: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "대시보드" },
    { id: "logs", label: "로그" },
    { id: "access", label: "접속 로그" },
  ];

  return (
    <>
      <div className="shell">
        <aside className="side">
          <div className="brand">BotMng</div>
          <nav className="nav" aria-label="메뉴">
            {items.map((it) => (
              <button key={it.id} className={`nav-item${tab === it.id ? " active" : ""}`} aria-current={tab === it.id ? "page" : undefined} onClick={() => setTab(it.id)}>
                {it.label}
              </button>
            ))}
          </nav>
          <div className="side-foot">
            <div className="who">
              <span>{session.username}</span>
              <small>{session.role === "admin" ? "관리자" : "게스트 (읽기 전용)"}</small>
            </div>
            <button onClick={logout}>로그아웃</button>
          </div>
        </aside>
        <main className="content">{tab === "dashboard" ? <Dashboard /> : tab === "logs" ? <Logs /> : <AccessLogs />}</main>
      </div>
      {modal}
    </>
  );
}
