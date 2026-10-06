import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { IconButton, Theme, Tooltip } from "@radix-ui/themes";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";

// 처음에는 시스템 설정(prefers-color-scheme)을 따르고, 토글하면 그 선택을 브라우저에 계속 저장한다.
type Appearance = "light" | "dark";
const KEY = "botmng.theme";

const readStored = (): Appearance | null => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null; // 저장소를 쓸 수 없는 환경(시크릿 모드 등)
  }
};

const Ctx = createContext<{ appearance: Appearance; toggle: () => void }>({ appearance: "light", toggle: () => {} });
export const useAppearance = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState(readStored);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const appearance: Appearance = stored ?? (systemDark ? "dark" : "light");
  useEffect(() => {
    document.documentElement.style.colorScheme = appearance; // 스크롤바·기본 컨트롤 색
  }, [appearance]);

  const toggle = () => {
    const next: Appearance = appearance === "dark" ? "light" : "dark";
    setStored(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* 저장 실패해도 현재 화면에는 적용된다 */
    }
  };

  return (
    <Ctx.Provider value={{ appearance, toggle }}>
      <Theme appearance={appearance} accentColor="iris" grayColor="slate" radius="medium" panelBackground="solid">
        {children}
      </Theme>
    </Ctx.Provider>
  );
}

export function ThemeToggle() {
  const { appearance, toggle } = useAppearance();
  const label = appearance === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환";
  return (
    <Tooltip content={label}>
      <IconButton variant="soft" color="gray" aria-label={label} onClick={toggle}>
        {appearance === "dark" ? <SunIcon /> : <MoonIcon />}
      </IconButton>
    </Tooltip>
  );
}
