/**
 * 관리자 콘솔의 에러 해석.
 *
 * 백엔드 에러는 `{ error: { code, message, field } }`로 오고, 코드는
 * VALIDATION_FAILED · UNAUTHORIZED · FORBIDDEN · NOT_FOUND ·
 * DUPLICATE_RESOURCE · NOT_IMPLEMENTED · INTERNAL_ERROR 뿐이다.
 * `message`는 손대지 않고 그대로 화면에 내보낸다.
 */
import { ApiError } from "../../api/client";

export const ADMIN_FORBIDDEN_MESSAGE = "관리자 권한이 없는 계정입니다";
export const ADMIN_UNAUTHORIZED_MESSAGE =
  "세션이 만료되었습니다. 다시 로그인해 주세요.";

export interface AdminErrorInfo {
  readonly message: string;
  readonly code: string;
  readonly field: string | null;
  readonly status: number | null;
}

export function toAdminErrorInfo(error: unknown): AdminErrorInfo {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      code: error.code,
      field: error.field,
      status: error.status,
    };
  }
  return {
    message: "서버에 연결하지 못했습니다. 백엔드가 실행 중인지 확인하세요.",
    code: "UNKNOWN_ERROR",
    field: null,
    status: null,
  };
}

/** 다시 로그인해야 하는 에러인지 가른다. 그 밖의 에러는 화면에 남긴다. */
export type AdminAuthFailure = "forbidden" | "unauthorized";

export function toAdminAuthFailure(error: unknown): AdminAuthFailure | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 403 || error.code === "FORBIDDEN") return "forbidden";
  if (
    error.status === 401 ||
    error.code === "UNAUTHORIZED" ||
    error.code === "AUTH_REQUIRED"
  ) {
    return "unauthorized";
  }
  return null;
}

/**
 * 서버가 아직 그 엔드포인트를 열지 않은 상태인지 가른다.
 *
 * 프론트가 백엔드보다 먼저 나갈 때, 붉은 에러 패널로 관리자를 놀래는 대신
 * 조용한 안내로 떨어뜨리기 위한 것이다. 실제 장애와 구분해야 하므로
 * "없다"는 신호(404·미구현)만 여기에 담는다.
 */
export function isAdminEndpointMissing(error: AdminErrorInfo): boolean {
  return (
    error.status === 404 ||
    error.code === "NOT_FOUND" ||
    error.code === "NOT_IMPLEMENTED"
  );
}

export function toAuthFailureMessage(failure: AdminAuthFailure): string {
  return failure === "forbidden"
    ? ADMIN_FORBIDDEN_MESSAGE
    : ADMIN_UNAUTHORIZED_MESSAGE;
}
