import { Button, Callout, Text, TextField } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { FormEvent, useState } from "react";
import { Session, login, loginAsGuest, saveSession } from "./api";
import { ThemeToggle } from "./theme";

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
    <div className="login-wrap">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <form className="login" onSubmit={submit}>
        <div className="brand">BotMng</div>
        <p className="lede-text">일정 알림 봇의 로그를 한곳에서 봅니다.</p>
        <label className="field">
          <Text size="2" color="gray">
            아이디
          </Text>
          <TextField.Root value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
        </label>
        <label className="field">
          <Text size="2" color="gray">
            비밀번호
          </Text>
          <TextField.Root type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {!consented && (
          <Callout.Root color="amber" size="1" className="notice">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              접속 정보 수집에 동의해야 이용할 수 있습니다.{" "}
              <button type="button" className="linklike" onClick={onShowNotice}>
                안내 보기
              </button>
            </Callout.Text>
          </Callout.Root>
        )}
        {error && <p className="error-text">{error}</p>}
        <Button size="2" type="submit" disabled={!consented || busy || !username || !password}>
          로그인
        </Button>
        <div className="divider">또는</div>
        <Button size="2" type="button" variant="soft" color="gray" disabled={!consented || busy} onClick={() => void run(loginAsGuest)}>
          게스트로 로그인
        </Button>
        <p className="hint">읽기 전용 게스트 계정으로 둘러볼 수 있습니다.</p>
      </form>
    </div>
  );
}
