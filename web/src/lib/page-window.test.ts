import assert from "node:assert/strict";
import { test } from "node:test";
import { pageWindow } from "./page-window.ts";

test("페이지가 적으면 전부 보인다", () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(2, 3), [1, 2, 3]);
  assert.deepEqual(pageWindow(3, 5), [1, 2, 3, 4, 5]);
});

test("처음·끝과 현재 주변만 보이고 생략 구간은 …", () => {
  assert.deepEqual(pageWindow(10, 20), [1, "…", 9, 10, 11, "…", 20]);
});

test("앞쪽에서는 앞 생략이 없다", () => {
  assert.deepEqual(pageWindow(1, 20), [1, 2, "…", 20]);
  assert.deepEqual(pageWindow(2, 20), [1, 2, 3, "…", 20]);
});

test("끝쪽에서는 뒤 생략이 없다", () => {
  assert.deepEqual(pageWindow(20, 20), [1, "…", 19, 20]);
  assert.deepEqual(pageWindow(19, 20), [1, "…", 18, 19, 20]);
});

test("한 칸만 건너뛰는 곳에는 …을 쓰지 않는다 (1 … 3 대신 1 2 3)", () => {
  assert.deepEqual(pageWindow(4, 20), [1, 2, 3, 4, 5, "…", 20]);
});
