import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDuration } from "./format-duration.ts";

test("1초 미만은 ms 그대로", () => {
  assert.equal(formatDuration(0), "0ms");
  assert.equal(formatDuration(80), "80ms");
  assert.equal(formatDuration(999), "999ms");
});

test("1초 이상은 소수점 한 자리 초", () => {
  assert.equal(formatDuration(1000), "1.0초");
  assert.equal(formatDuration(10558), "10.6초");
  assert.equal(formatDuration(59949), "59.9초");
});

test("1분 이상은 분과 초", () => {
  assert.equal(formatDuration(60000), "1분 0초");
  assert.equal(formatDuration(65400), "1분 5초");
});
