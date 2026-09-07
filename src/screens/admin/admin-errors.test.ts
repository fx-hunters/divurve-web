import { describe, expect, it } from "vitest";
import { ApiError } from "../../api/client";
import {
  ADMIN_FORBIDDEN_MESSAGE,
  ADMIN_UNAUTHORIZED_MESSAGE,
  toAdminAuthFailure,
  toAdminErrorInfo,
  toAuthFailureMessage,
} from "./admin-errors";

describe("toAdminErrorInfo", () => {
  it("ApiError의 message·code·field·status를 그대로 옮긴다", () => {
    expect(
      toAdminErrorInfo(
        new ApiError("기간이 올바르지 않습니다.", 400, "VALIDATION_FAILED", "from"),
      ),
    ).toEqual({
      message: "기간이 올바르지 않습니다.",
      code: "VALIDATION_FAILED",
      field: "from",
      status: 400,
    });
  });

  it("알 수 없는 예외는 연결 안내로 바꾼다", () => {
    expect(toAdminErrorInfo(new Error("boom"))).toEqual({
      message: "서버에 연결하지 못했습니다. 백엔드가 실행 중인지 확인하세요.",
      code: "UNKNOWN_ERROR",
      field: null,
      status: null,
    });
  });
});

describe("toAdminAuthFailure", () => {
  it("403과 FORBIDDEN을 권한 없음으로 본다", () => {
    expect(toAdminAuthFailure(new ApiError("m", 403, "FORBIDDEN"))).toBe(
      "forbidden",
    );
    expect(toAdminAuthFailure(new ApiError("m", 500, "FORBIDDEN"))).toBe(
      "forbidden",
    );
  });

  it("401 계열을 세션 만료로 본다", () => {
    expect(toAdminAuthFailure(new ApiError("m", 401, "UNAUTHORIZED"))).toBe(
      "unauthorized",
    );
    expect(toAdminAuthFailure(new ApiError("m", 0, "AUTH_REQUIRED"))).toBe(
      "unauthorized",
    );
    expect(toAdminAuthFailure(new ApiError("m", 0, "UNAUTHORIZED"))).toBe(
      "unauthorized",
    );
  });

  it("그 밖의 에러와 일반 예외는 세션을 건드리지 않는다", () => {
    expect(toAdminAuthFailure(new ApiError("m", 404, "NOT_FOUND"))).toBeNull();
    expect(toAdminAuthFailure(new Error("boom"))).toBeNull();
  });
});

describe("toAuthFailureMessage", () => {
  it("사유별 안내 문구를 돌려준다", () => {
    expect(toAuthFailureMessage("forbidden")).toBe(ADMIN_FORBIDDEN_MESSAGE);
    expect(toAuthFailureMessage("unauthorized")).toBe(
      ADMIN_UNAUTHORIZED_MESSAGE,
    );
  });
});
