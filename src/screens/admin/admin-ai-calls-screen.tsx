/**
 * 2-6. AI 호출 로그·사용량 집계.
 *
 * 집계를 위에, 행 목록을 아래에 둔다 — 관리자가 실제로 보는 것은 집계이고,
 * 목록은 집계에서 이상한 날을 찾은 뒤 그 안을 들여다보는 용도다
 * (백엔드 이슈 fx-hunters/divurve-api#143).
 *
 * 비용 금액은 만들지 않는다. 서버가 토큰까지만 주고, 모델별 단가 적용은 팀
 * 결정 대기다 — 틀린 금액을 보여 주는 것보다 토큰만 보여 주는 편이 안전하다.
 */
import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminAiCalls,
  fetchAdminAiUsageSummary,
} from "../../api/admin";
import { AdminAiCallFilters } from "./admin-ai-call-filters";
import {
  toInitialAiCallFilters,
  toUtcRangeEnd,
  toUtcRangeStart,
  type AdminAiCallFilterValues,
} from "./admin-ai-call-query";
import { AdminAiCallTable } from "./admin-ai-call-table";
import { AdminAiUsageSummaryTable } from "./admin-ai-usage-summary";
import { toIsDemoParam } from "./admin-demo-filter";
import type { AdminAuthFailure } from "./admin-errors";
import {
  AdminErrorPanel,
  AdminLoadingPanel,
  AdminMetaLine,
  AdminSection,
} from "./admin-panels";

import { useAdminRequest } from "./use-admin-request";

export const ADMIN_AI_CALLS_PAGE_SIZE = 50;

interface AdminAiCallsScreenProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
  readonly onSelectUser: (userId: string) => void;
}

export function AdminAiCallsScreen({
  onAuthFailure,
  onSelectUser,
}: AdminAiCallsScreenProps) {
  const [draft, setDraft] = useState<AdminAiCallFilterValues>(() =>
    toInitialAiCallFilters(new Date()),
  );
  const [applied, setApplied] = useState<AdminAiCallFilterValues>(draft);
  const [page, setPage] = useState(0);

  const { state: summaryState, send: sendSummary } = useAdminRequest(
    fetchAdminAiUsageSummary,
    onAuthFailure,
  );
  const { state: callsState, send: sendCalls } = useAdminRequest(
    fetchAdminAiCalls,
    onAuthFailure,
  );

  useEffect(() => {
    void sendSummary({
      from: toUtcRangeStart(applied.from),
      to: toUtcRangeEnd(applied.to),
    });
  }, [sendSummary, applied.from, applied.to]);

  useEffect(() => {
    void sendCalls({
      page,
      size: ADMIN_AI_CALLS_PAGE_SIZE,
      from: toUtcRangeStart(applied.from),
      to: toUtcRangeEnd(applied.to),
      purpose: applied.purpose,
      surface: applied.surface,
      outcome: applied.outcome,
      isDemo: toIsDemoParam(applied.demo),
    });
  }, [sendCalls, page, applied]);

  /** 조회 조건이 바뀌면 첫 페이지부터 다시 본다. */
  const handleApply = useCallback(() => {
    setPage(0);
    setApplied(draft);
  }, [draft]);

  const summary = summaryState.status === "success" ? summaryState.result : null;
  const calls = callsState.status === "success" ? callsState.result : null;

  return (
    <>
      <AdminSection
        title="AI 사용량 집계"
        description="일자·용도·모델별 집계입니다. day는 UTC 기준으로 자른 날짜이며, 조회 기간도 UTC 기준으로 보냅니다. 비용 금액은 서버가 내지 않아 토큰 수만 표시합니다."
      >
        <AdminAiCallFilters
          values={draft}
          onChange={setDraft}
          onSubmit={handleApply}
        />

        {summaryState.status === "loading" && (
          <AdminLoadingPanel label="사용량 집계를 불러오는 중입니다." />
        )}
        {summaryState.status === "error" && (
          <AdminErrorPanel error={summaryState.error} />
        )}
        {summary !== null && (
          <>
            <AdminMetaLine meta={summary.meta} />
            <AdminAiUsageSummaryTable buckets={summary.data.buckets} />
          </>
        )}
      </AdminSection>

      <AdminSection
        title="AI 호출 로그"
        description="최신순입니다. requestedAt은 KST로 표시합니다. userId가 비어 있는 행은 계정이 지워졌거나 사용자 없이 도는 배치 호출이라 상세로 이동할 수 없습니다."
      >
        {callsState.status === "loading" && (
          <AdminLoadingPanel label="호출 로그를 불러오는 중입니다." />
        )}
        {callsState.status === "error" && (
          <AdminErrorPanel error={callsState.error} />
        )}
        {calls !== null && (
          <>
            <AdminMetaLine meta={calls.meta} />
            <AdminAiCallTable
              listing={calls.data}
              currentPage={page}
              size={ADMIN_AI_CALLS_PAGE_SIZE}
              onChangePage={setPage}
              onSelectUser={onSelectUser}
            />
          </>
        )}
      </AdminSection>
    </>
  );
}
