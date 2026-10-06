import { withoutStored } from "./log-dedupe";

const e = (fileOffset: number, message = `m${fileOffset}`) => ({ fileOffset, message });

describe("withoutStored", () => {
  it("이미 저장된 위치의 항목은 빼고 새 항목만 남긴다 (순서 유지)", () => {
    const entries = [e(0), e(10), e(20), e(30)];
    expect(withoutStored(entries, [0, 20]).map((x) => x.fileOffset)).toEqual([10, 30]);
  });

  it("저장된 것이 없으면 그대로", () => {
    expect(withoutStored([e(0), e(10)], [])).toHaveLength(2);
  });

  it("전부 이미 저장돼 있으면 빈 배열 (읽은 위치가 되돌아갔을 때)", () => {
    expect(withoutStored([e(0), e(10)], [0, 10, 99])).toEqual([]);
  });

  it("항목이 없어도 안전하다", () => {
    expect(withoutStored([], [1, 2])).toEqual([]);
  });

  it("Set 도 받는다", () => {
    expect(withoutStored([e(0), e(5)], new Set([5])).map((x) => x.fileOffset)).toEqual([0]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const entries = [e(0), e(10)];
    withoutStored(entries, [0]);
    expect(entries).toHaveLength(2);
  });
});
