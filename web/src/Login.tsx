import { FormEvent, useState } from "react";
import { Session, login, loginAsGuest, saveSession } from "./api";

export function Login({ onLogin, consented, onShowNotice }: { onLogin: (s: Session) => void; consented: boolean; onShowNotice: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (attempt: () => Promise<Session>) => {
    setBusy(true);
    setError("");
    try {
      const session = await attempt();
      saveSession(session);
      onLogin(session);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!consented) return;
    void run(() => login(username, password));
  };

  return (
    <form className="login card" onSubmit={submit}>
      <h1>BotMng</h1>
      <label>
        아이디
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
      </label>
      <label>
        비밀번호
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </label>
      {!consented && (
        <p className="notice">
          접속 정보 수집에 동의해야 이용할 수 있습니다.{" "}
          <button type="button" className="link" onClick={onShowNotice}>
            안내 보기
          </button>
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
      <button className="primary" disabled={!consented || busy || !username || !password}>
        로그인
      </button>
      <div className="divider">또는</div>
      <button type="button" disabled={!consented || busy} onClick={() => void run(loginAsGuest)}>
        게스트로 로그인
      </button>
      <p className="muted hint">읽기 전용 게스트 계정으로 둘러볼 수 있습니다.</p>
    </form>
  );
}
