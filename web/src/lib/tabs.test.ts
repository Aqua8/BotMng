import assert from "node:assert/strict";
import { test } from "node:test";
import { activeTabFor, tabsFor } from "./tabs.ts";

test("관리자는 접속 로그 메뉴까지 보인다", () => {
  assert.deepEqual(tabsFor("admin").map((t) => t.id), ["dashboard", "logs", "access"]);
});

test("게스트에게는 접속 로그 메뉴가 없다", () => {
  assert.deepEqual(tabsFor("guest").map((t) => t.id), ["dashboard", "logs"]);
});

test("게스트가 접속 로그 탭에 머물러 있으면 대시보드로 돌린다 (관리자로 보다가 로그아웃한 경우)", () => {
  assert.equal(activeTabFor("access", "guest"), "dashboard");
  assert.equal(activeTabFor("logs", "guest"), "logs");
});

test("관리자는 보던 탭이 그대로 유지된다", () => {
  assert.equal(activeTabFor("access", "admin"), "access");
});
