import assert from "node:assert/strict";
import { test } from "node:test";
import { rangeFor } from "./quick-range.ts";

// 2026-10-07T03:30:00Z = 한국 시간 2026-10-07 12:30
const NOON = new Date("2026-10-07T03:30:00Z");

test("최근 1시간: 한국 시간 기준 한 시간 전부터, 끝은 비워 둔다(진행 중인 로그 포함)", () => {
  assert.deepEqual(rangeFor("1h", NOON), { from: "2026-10-07T11:30", to: "" });
});

test("오늘: 한국 시간 오늘 00:00부터", () => {
  assert.deepEqual(rangeFor("today", NOON), { from: "2026-10-07T00:00", to: "" });
});

test("최근 24시간 / 7일", () => {
  assert.deepEqual(rangeFor("24h", NOON), { from: "2026-10-06T12:30", to: "" });
  assert.deepEqual(rangeFor("7d", NOON), { from: "2026-09-30T12:30", to: "" });
});

test("해제: 시작·끝을 모두 비운다", () => {
  assert.deepEqual(rangeFor("clear", NOON), { from: "", to: "" });
});

test("한국 시간 자정 직후에는 UTC 로는 전날이어도 '오늘'은 한국 날짜 기준", () => {
  // 2026-10-06T15:30:00Z = 한국 시간 2026-10-07 00:30
  const justAfterMidnight = new Date("2026-10-06T15:30:00Z");
  assert.deepEqual(rangeFor("today", justAfterMidnight), { from: "2026-10-07T00:00", to: "" });
  assert.deepEqual(rangeFor("1h", justAfterMidnight), { from: "2026-10-06T23:30", to: "" });
});

test("한국 시간 자정 직전에는 아직 같은 날", () => {
  // 2026-10-07T14:59:00Z = 한국 시간 2026-10-07 23:59
  assert.deepEqual(rangeFor("today", new Date("2026-10-07T14:59:00Z")), { from: "2026-10-07T00:00", to: "" });
});
