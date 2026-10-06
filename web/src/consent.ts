// 접속 로그 수집 동의 상태. "24시간 보이지 않기"를 체크하고 동의하면 localStorage 에 만료 시각과 함께 24시간,
// 체크 없이 동의하면 sessionStorage 에 남겨 탭을 닫을 때까지만 유지한다. 둘 다 없으면 모달을 띄운다.
// 서버는 동의 여부를 검증하지 않는다 (화면에서만 막음).
const KEY = "botmng.consent";
const DAY_MS = 24 * 60 * 60 * 1000;

let memory = false; // 저장소를 쓸 수 없는 환경(시크릿 모드 등)에서 현재 페이지 동안만 유지

function readLocal(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw) as { expiresAt?: number };
    if (typeof expiresAt === "number" && expiresAt > Date.now()) return true;
    localStorage.removeItem(KEY); // 만료됨
  } catch {
    /* 저장소 접근 불가 또는 손상된 값 */
  }
  return false;
}

function readSession(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export const hasConsent = (): boolean => memory || readLocal() || readSession();

export function saveConsent(remember24h: boolean) {
  memory = true;
  try {
    if (remember24h) {
      localStorage.setItem(KEY, JSON.stringify({ agreedAt: Date.now(), expiresAt: Date.now() + DAY_MS }));
      sessionStorage.removeItem(KEY);
    } else {
      localStorage.removeItem(KEY);
      sessionStorage.setItem(KEY, "1");
    }
  } catch {
    /* 메모리에만 유지 */
  }
}

export function clearConsent() {
  memory = false;
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}
