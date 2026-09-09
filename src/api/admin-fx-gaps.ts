/**
 * 환율 시계열의 결측 조회·백필 (백엔드 이슈 fx-hunters/divurve-api#116).
 *
 * 백엔드에는 오래전부터 있었지만 프론트에 호출부가 없던 두 엔드포인트다.
 * 대시보드(#84)와 결측 히트맵(#85)이 함께 쓰므로 어느 한쪽에 두지 않고
 * 여기로 뺐다 — `api/admin.ts`는 이미 크고, 두 화면이 같은 클라이언트를
 * 각자 만들 뻔했다(#93).
 *
 * 백엔드가 답하는 것은 "이 구간을 믿고 계산해도 되는가" 하나다. 그래서
 * 관측 개수가 아니라 **빠진 구간**과 완전 여부를 앞세운 모양으로 온다.
 * 백필을 한 번 돌린 뒤에도 남은 구멍은 공휴일이 아니라 받지 못한 날이다 —
 * 고시가 없는 날은 부재로 확정돼 커버리지에 포함되기 때문이다.
 */
import { apiPath, requestWithMeta, type ApiResult } from "./client";
import {
  isRecord,
  readArray,
  readBoolean,
  readNumber,
  readString,
  type AdminRecord,
} from "./admin-record";

const ADMIN_BASE = "/api/v1/admin";

/** 조회·백필이 함께 쓰는 조회 조건. 비우면 서버가 기본값을 정한다. */
export interface AdminFxGapQuery {
  /** 통화쌍 6자리. 비우면 저장 대상 통화쌍 전부를 본다. */
  readonly pairCode?: string;
  /** 조회 시작일 `YYYY-MM-DD`. */
  readonly from?: string;
  /** 조회 끝일 `YYYY-MM-DD`. */
  readonly to?: string;
}

/** 빠진 연속 구간 하나. 날짜는 모두 영업일이다. */
export interface AdminFxGap {
  readonly from: string | null;
  readonly to: string | null;
  readonly businessDays: number | null;
}

/** 통화쌍 하나의 커버리지. */
export interface AdminFxPairCoverage {
  readonly pairCode: string | null;
  readonly rateType: string | null;
  readonly from: string | null;
  readonly to: string | null;
  readonly expectedBusinessDays: number | null;
  /** 값이 있거나 고시 부재가 확정된 날 수. */
  readonly coveredBusinessDays: number | null;
  readonly missingBusinessDays: number | null;
  /** 0.0~1.0. 서버가 계산한 값을 그대로 담는다. */
  readonly coverageRatio: number | null;
  /** 구멍이 하나도 없는가. */
  readonly complete: boolean | null;
  readonly gaps: readonly AdminFxGap[];
}

export interface AdminFxCoverage {
  readonly pairs: readonly AdminFxPairCoverage[];
}

function toGap(row: AdminRecord): AdminFxGap {
  return {
    from: readString(row, "from"),
    to: readString(row, "to"),
    businessDays: readNumber(row, "businessDays"),
  };
}

function toPairCoverage(row: AdminRecord): AdminFxPairCoverage {
  return {
    pairCode: readString(row, "pairCode"),
    rateType: readString(row, "rateType"),
    from: readString(row, "from"),
    to: readString(row, "to"),
    expectedBusinessDays: readNumber(row, "expectedBusinessDays"),
    coveredBusinessDays: readNumber(row, "coveredBusinessDays"),
    missingBusinessDays: readNumber(row, "missingBusinessDays"),
    coverageRatio: readNumber(row, "coverageRatio"),
    complete: readBoolean(row, "complete"),
    gaps: readArray(row, "gaps").map(toGap),
  };
}

export function normalizeAdminFxCoverage(data: unknown): AdminFxCoverage {
  const source = isRecord(data) ? data : {};
  return { pairs: readArray(source, "pairs").map(toPairCoverage) };
}

/** 읽기 전용이다. 이 호출은 수집을 일으키지 않는다. */
export async function fetchAdminFxGaps(
  query: AdminFxGapQuery = {},
): Promise<ApiResult<AdminFxCoverage>> {
  const result = await requestWithMeta<unknown>(
    apiPath(`${ADMIN_BASE}/fx-rates/gaps`, { ...query }),
  );
  return { data: normalizeAdminFxCoverage(result.data), meta: result.meta };
}

/** 통화쌍 하나의 백필 결과. `failureReason`이 있으면 실패다. */
export interface AdminFxBackfillPair {
  readonly pairCode: string | null;
  /** 값으로 채운 날 수. */
  readonly filled: number | null;
  /** 고시가 없다고 확정한 날 수 — 공휴일이 여기로 들어간다. */
  readonly confirmedAbsent: number | null;
  readonly missingBefore: number | null;
  readonly missingAfter: number | null;
  readonly complete: boolean | null;
  /** 백필 후에도 남은 구간. 비어 있지 않으면 서버도 답하지 못한 구간이다. */
  readonly remainingGaps: readonly AdminFxGap[];
  readonly failureReason: string | null;
}

export interface AdminFxBackfillReport {
  readonly pairs: readonly AdminFxBackfillPair[];
  readonly totalFilled: number | null;
  readonly totalConfirmedAbsent: number | null;
  readonly hasFailure: boolean | null;
  readonly complete: boolean | null;
  readonly backfilledAt: string | null;
}

export function normalizeAdminFxBackfill(
  data: unknown,
): AdminFxBackfillReport {
  const source = isRecord(data) ? data : {};
  return {
    pairs: readArray(source, "pairs").map((row) => ({
      pairCode: readString(row, "pairCode"),
      filled: readNumber(row, "filled"),
      confirmedAbsent: readNumber(row, "confirmedAbsent"),
      missingBefore: readNumber(row, "missingBefore"),
      missingAfter: readNumber(row, "missingAfter"),
      complete: readBoolean(row, "complete"),
      remainingGaps: readArray(row, "remainingGaps").map(toGap),
      failureReason: readString(row, "failureReason"),
    })),
    totalFilled: readNumber(source, "totalFilled"),
    totalConfirmedAbsent: readNumber(source, "totalConfirmedAbsent"),
    hasFailure: readBoolean(source, "hasFailure"),
    complete: readBoolean(source, "complete"),
    backfilledAt: readString(source, "backfilledAt"),
  };
}

/**
 * 빠진 구간만 다시 받아 메운다. **전체 재적재가 아니다.**
 *
 * 서버가 값을 받지 못한 날은 고시 부재로 확정해 다음 판정에서 구멍으로
 * 세지 않는다. 그래서 같은 구간을 다시 눌러도 결과가 계속 줄어든다.
 */
export async function backfillAdminFxGaps(
  query: AdminFxGapQuery = {},
): Promise<ApiResult<AdminFxBackfillReport>> {
  const result = await requestWithMeta<unknown>(
    apiPath(`${ADMIN_BASE}/fx-rates/backfill`, { ...query }),
    { method: "POST" },
  );
  return { data: normalizeAdminFxBackfill(result.data), meta: result.meta };
}
