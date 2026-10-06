import { FormEvent, useState } from "react";
import { Session, login, saveSession } from "./api";

export function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await login(username, password);
      saveSession(session);
      onLogin(session);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
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
      {error && <p className="error-text">{error}</p>}
      <button className="primary" disabled={busy || !username || !password}>
        로그인
      </button>
    </form>
  );
}
