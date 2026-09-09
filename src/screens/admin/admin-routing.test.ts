import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_ITEMS,
  adminUserDetailPath,
  isAdminPath,
  resolveAdminRoute,
} from "./admin-routing";

describe("isAdminPath", () => {
  it("/admin 과 그 하위만 관리자 경로로 본다", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/")).toBe(true);
    expect(isAdminPath("/admin//users")).toBe(true);
    expect(isAdminPath("/admin/users/3")).toBe(true);
    expect(isAdminPath("/")).toBe(false);
    expect(isAdminPath("/administrator")).toBe(false);
    expect(isAdminPath("/mypage")).toBe(false);
  });
});

describe("resolveAdminRoute", () => {
  it("섹션별 화면을 고른다", () => {
    expect(resolveAdminRoute("/admin")).toEqual({ kind: "dashboard" });
    expect(resolveAdminRoute("/admin/users")).toEqual({ kind: "users" });
    expect(resolveAdminRoute("/admin/currencies")).toEqual({
      kind: "currencies",
    });
    expect(resolveAdminRoute("/admin/fx-rates")).toEqual({ kind: "fxRates" });
    expect(resolveAdminRoute("/admin/fx-rates/gaps")).toEqual({
      kind: "fxGaps",
    });
    expect(resolveAdminRoute("/admin/ai/explain")).toEqual({
      kind: "aiExplain",
    });
    expect(resolveAdminRoute("/admin/ai/extract")).toEqual({
      kind: "aiExtract",
    });
    expect(resolveAdminRoute("/admin/ai/calls")).toEqual({
      kind: "aiCallLogs",
    });
  });

  it("ai 하위 경로가 없으면 설명 화면으로 본다", () => {
    expect(resolveAdminRoute("/admin/ai")).toEqual({ kind: "aiExplain" });
  });

  it("사용자 id를 디코딩해 상세로 보낸다", () => {
    expect(resolveAdminRoute("/admin/users/a%2Fb")).toEqual({
      kind: "userDetail",
      userId: "a/b",
    });
  });

  it("환율 하위 경로가 결측이 아니면 시계열 화면으로 본다", () => {
    expect(resolveAdminRoute("/admin/fx-rates/other")).toEqual({
      kind: "fxRates",
    });
  });

  it("모르는 경로는 대시보드로 떨어진다", () => {
    expect(resolveAdminRoute("/admin/unknown")).toEqual({ kind: "dashboard" });
  });
});

describe("adminUserDetailPath", () => {
  it("id를 인코딩해 경로를 만든다", () => {
    expect(adminUserDetailPath("a/b")).toBe("/admin/users/a%2Fb");
  });
});

describe("ADMIN_NAV_ITEMS", () => {
  it("모든 메뉴가 실제 라우트로 이어진다", () => {
    for (const item of ADMIN_NAV_ITEMS) {
      expect(item.kinds).toContain(resolveAdminRoute(item.path).kind);
    }
  });

  it("묶음을 편 것이 곧 메뉴 목록이다", () => {
    const flattened = ADMIN_NAV_GROUPS.flatMap((group) => group.items);
    expect(ADMIN_NAV_ITEMS).toEqual(flattened);
  });

  it("경로가 겹치는 메뉴는 없다", () => {
    const paths = ADMIN_NAV_ITEMS.map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("ADMIN_NAV_GROUPS", () => {
  it("묶음 이름은 있을 수도 없을 수도 있고, 빈 묶음은 두지 않는다", () => {
    expect(ADMIN_NAV_GROUPS.some((group) => group.label === undefined)).toBe(
      true,
    );
    expect(ADMIN_NAV_GROUPS.some((group) => group.label !== undefined)).toBe(
      true,
    );
    for (const group of ADMIN_NAV_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0);
    }
  });
});
