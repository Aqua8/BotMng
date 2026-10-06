import { DEFAULT_PAGE_SIZE, PAGE_SIZES, pageOffset, resolveSort, sortErrorMessage } from "./paging";

describe("pageOffset", () => {
  it("1페이지는 0, 이후는 (page-1)*pageSize", () => {
    expect(pageOffset(1, 50)).toBe(0);
    expect(pageOffset(3, 20)).toBe(40);
    expect(pageOffset(2, 100)).toBe(100);
  });
});

describe("PAGE_SIZES", () => {
  it("허용하는 페이지 크기는 5/10/20/50/100이고 기본은 20", () => {
    expect([...PAGE_SIZES]).toEqual([5, 10, 20, 50, 100]);
    expect(DEFAULT_PAGE_SIZE).toBe(20);
    expect(PAGE_SIZES).toContain(DEFAULT_PAGE_SIZE);
  });
});

describe("resolveSort", () => {
  const allowed = ["loggedAt", "level", "tag"] as const;

  it("지정하지 않으면 시각 내림차순", () => {
    expect(resolveSort(undefined, undefined, allowed)).toEqual({ column: "loggedAt", direction: "DESC" });
  });

  it("허용된 열은 요청한 방향으로", () => {
    expect(resolveSort("level", "asc", allowed)).toEqual({ column: "level", direction: "ASC" });
    expect(resolveSort("tag", "desc", allowed)).toEqual({ column: "tag", direction: "DESC" });
  });

  it("방향을 생략하면 내림차순", () => {
    expect(resolveSort("tag", undefined, allowed)).toEqual({ column: "tag", direction: "DESC" });
  });

  it("허용되지 않은 열은 null (호출한 쪽에서 400 처리)", () => {
    expect(resolveSort("message", "asc", allowed)).toBeNull();
    expect(resolveSort("id; DROP TABLE users", "asc", allowed)).toBeNull();
  });
});

describe("sortErrorMessage", () => {
  const allowed = ["loggedAt", "level", "tag"];

  it("사용할 수 있는 열을 알려준다", () => {
    expect(sortErrorMessage(allowed)).toBe("정렬할 수 없는 열입니다. 사용할 수 있는 열: loggedAt, level, tag");
  });

  it("보낸 값은 응답에 되돌려주지 않는다 (인자로 받지도 않는다)", () => {
    expect(sortErrorMessage.length).toBe(1);
    expect(sortErrorMessage(allowed)).not.toContain("SELECT");
  });
});
