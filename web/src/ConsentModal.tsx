import { useEffect, useRef, useState } from "react";

interface Props {
  onAgree: (remember24h: boolean) => void;
  onDecline: () => void;
}

export function ConsentModal({ onAgree, onDecline }: Props) {
  const [remember, setRemember] = useState(false);
  const agreeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    agreeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDecline();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDecline]);

  return (
    <div className="overlay" role="presentation">
      <div className="modal card" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <h2 id="consent-title">BotMng에 오신 것을 환영합니다</h2>
        <p>
          BotMng는 개인 Discord 일정 알림 봇(ScheduleAlertBot)의 로그를 수집해 한눈에 보여 주는 관제 서비스입니다. 로그 조회·검색,
          실시간 확인, 대시보드를 제공합니다.
        </p>

        <h3>접속 정보 수집 안내</h3>
        <p>서비스 보안과 이용 현황 확인을 위해 로그인할 때 아래 정보를 수집·저장합니다.</p>
        <ul>
          <li>접속 시각, 입력한 아이디 (비밀번호는 저장하지 않습니다)</li>
          <li>IP 주소와 국가</li>
          <li>운영체제, 웹 브라우저, 기기 종류</li>
        </ul>
        <p className="muted">
          수집한 정보는 365일 보관 후 삭제하며 &quot;접속 로그&quot; 화면에서 확인할 수 있습니다 (게스트에게는 IP 일부만 표시됩니다).
          동의하지 않으시면 로그인과 게스트 이용이 제한됩니다.
        </p>

        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          24시간 동안 보지 않기
        </label>

        <div className="modal-actions">
          <button onClick={onDecline}>동의하지 않음</button>
          <button ref={agreeRef} className="primary" onClick={() => onAgree(remember)}>
            동의
          </button>
        </div>
      </div>
    </div>
  );
}
