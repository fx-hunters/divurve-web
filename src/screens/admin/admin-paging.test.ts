import { describe, expect, it } from "vitest";
import { hasAdminNextPage } from "./admin-paging";

describe("hasAdminNextPage", () => {
  it("totalPages가 있으면 그 값만 믿는다", () => {
    expect(hasAdminNextPage({ items: [], totalPages: 3 }, 1, 50)).toBe(true);
    expect(hasAdminNextPage({ items: [], totalPages: 2 }, 1, 50)).toBe(false);
  });

  it("totalPages가 없으면 이번 페이지가 가득 찼는지로 판단한다", () => {
    expect(
      hasAdminNextPage({ items: [{}, {}], totalPages: null }, 0, 2),
    ).toBe(true);
    expect(
      hasAdminNextPage({ items: [{}, {}], totalPages: null }, 0, 3),
    ).toBe(false);
  });
});
