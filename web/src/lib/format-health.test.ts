import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAgo, formatBytes, formatUptime } from "./format-health.ts";

test("formatBytes: 단위를 올려 가며 소수점 한 자리", () => {
  assert.equal(formatBytes(0), "0B");
  assert.equal(formatBytes(1023), "1,023B");
  assert.equal(formatBytes(1024), "1.0KB");
  assert.equal(formatBytes(180224), "176.0KB");
  assert.equal(formatBytes(1048576), "1.0MB");
  assert.equal(formatBytes(5 * 1024 * 1024 * 1024), "5.0GB");
});

test("formatUptime: 큰 단위 두 개까지", () => {
  assert.equal(formatUptime(14), "14초");
  assert.equal(formatUptime(125), "2분 5초");
  assert.equal(formatUptime(3700), "1시간 1분");
  assert.equal(formatUptime(90000), "1일 1시간");
});

test("formatAgo: 얼마 전인지", () => {
  const now = new Date("2026-10-07T00:30:00Z");
  assert.equal(formatAgo(new Date("2026-10-07T00:29:57Z").toISOString(), now), "3초 전");
  assert.equal(formatAgo(new Date("2026-10-07T00:28:00Z").toISOString(), now), "2분 전");
  assert.equal(formatAgo(new Date("2026-10-06T23:30:00Z").toISOString(), now), "1시간 전");
  assert.equal(formatAgo(new Date("2026-10-05T00:30:00Z").toISOString(), now), "2일 전");
});

test("formatAgo: 방금(0~1초)과 미래 시각은 '방금'", () => {
  const now = new Date("2026-10-07T00:30:00Z");
  assert.equal(formatAgo(now.toISOString(), now), "방금");
  assert.equal(formatAgo(new Date("2026-10-07T00:30:05Z").toISOString(), now), "방금");
});
