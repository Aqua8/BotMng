export type Tab = "dashboard" | "logs" | "access";
export type Role = "admin" | "guest";

const ALL_TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "대시보드" },
  { id: "logs", label: "로그" },
  { id: "access", label: "접속 로그" },
];

/** 역할별로 보이는 메뉴. 접속 로그(방문자의 IP, 국가, 브라우저)는 관리자에게만 보인다. */
export const tabsFor = (role: Role) => ALL_TABS.filter((t) => t.id !== "access" || role === "admin");

/**
 * 지금 보여 줄 탭. 로그아웃한 뒤 다른 역할로 로그인하면 이전 탭이 남아 있을 수 있어서,
 * 그 역할이 볼 수 없는 탭이면 대시보드로 돌린다.
 */
export const activeTabFor = (tab: Tab, role: Role): Tab => (tabsFor(role).some((t) => t.id === tab) ? tab : "dashboard");
