import { useEffect, useState } from "react";
import { Button } from "@radix-ui/themes";
import { ConsentModal } from "./ConsentModal";
import { ThemeToggle } from "./theme";
import { clearConsent, hasConsent, saveConsent } from "./consent";
import { Session, clearSession, getSession, resumeSession, setUnauthorizedHandler } from "./api";
import { AccessLogs } from "./AccessLogs";
import { Dashboard } from "./Dashboard";
import { Login } from "./Login";
import { Logs } from "./Logs";
import { activeTabFor, tabsFor, type Tab } from "./lib/tabs";

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

  // 저장된 로그인으로 화면을 열었음을 알린다. 접속 정보 수집에 동의한 뒤에만 보낸다 (동의하지 않으면 로그아웃되는 흐름이므로).
  useEffect(() => {
    if (session && consented) void resumeSession();
  }, [session?.accessToken, consented]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const items = tabsFor(session.role);
  const current = activeTabFor(tab, session.role);

  return (
    <>
      <div className="shell">
        <aside className="side">
          <div className="brand">BotMng</div>
          <nav className="nav" aria-label="메뉴">
            {items.map((it) => (
              <button key={it.id} className={`nav-item${current === it.id ? " active" : ""}`} aria-current={current === it.id ? "page" : undefined} onClick={() => setTab(it.id)}>
                {it.label}
              </button>
            ))}
          </nav>
          <div className="side-foot">
            <div className="who">
              <span>{session.username}</span>
              <small>{session.role === "admin" ? "관리자" : "게스트 (읽기 전용)"}</small>
            </div>
            <div className="side-actions">
              <ThemeToggle />
              <Button variant="soft" color="gray" onClick={logout}>
                로그아웃
              </Button>
            </div>
          </div>
        </aside>
        <main className="content">{current === "dashboard" ? <Dashboard /> : current === "logs" ? <Logs /> : <AccessLogs />}</main>
      </div>
      {modal}
    </>
  );
}
