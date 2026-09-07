import { describe, expect, it } from "vitest";
import {
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
    expect(resolveAdminRoute("/admin")).toEqual({ kind: "users" });
    expect(resolveAdminRoute("/admin/users")).toEqual({ kind: "users" });
    expect(resolveAdminRoute("/admin/currencies")).toEqual({
      kind: "currencies",
    });
    expect(resolveAdminRoute("/admin/fx-rates")).toEqual({ kind: "fxRates" });
    expect(resolveAdminRoute("/admin/ai/explain")).toEqual({
      kind: "aiExplain",
    });
    expect(resolveAdminRoute("/admin/ai/extract")).toEqual({
      kind: "aiExtract",
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

  it("모르는 경로는 사용자 목록으로 떨어진다", () => {
    expect(resolveAdminRoute("/admin/unknown")).toEqual({ kind: "users" });
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
});
