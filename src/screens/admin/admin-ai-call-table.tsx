/**
 * AI 호출 로그 행 목록.
 *
 * props만 받는 표현 컴포넌트다(AGENTS.md 7.2). 응답에 온 칸을 그대로 세우고
 * 합계·비용 금액을 만들지 않는다 — 모델별 단가 적용은 팀 결정 대기다.
 */
import type { AdminAiCall, AdminAiCallPage } from "../../api/admin";
import {
  toAdminAiModelLabel,
  toAdminAiOutcomeLabel,
  toAdminAiOutcomeTone,
  toAdminAiPurposeLabel,
} from "./admin-ai-call-vocabulary";
import { formatAdminDateTime } from "./admin-datetime";
import { hasAdminNextPage } from "./admin-paging";
import { AdminTable, type AdminColumn } from "./admin-table";
import { ADMIN_EMPTY_VALUE, formatAdminValue } from "./admin-value";

interface AdminAiCallTableProps {
  readonly listing: AdminAiCallPage;
  readonly currentPage: number;
  readonly size: number;
  readonly onChangePage: (nextPage: number) => void;
  /** `userId`가 있는 행에서만 부른다. */
  readonly onSelectUser: (userId: string) => void;
}

/**
 * 사용자 칸.
 *
 * `userId`가 null인 것은 정상값이라 링크를 걸 대상이 없다. 그대로 눌리게 두면
 * 없는 계정으로 이동해 404가 난다.
 */
function AdminAiCallUserCell({
  call,
  onSelectUser,
}: {
  readonly call: AdminAiCall;
  readonly onSelectUser: (userId: string) => void;
}) {
  if (call.userId === null) {
    return (
      <button type="button" className="admin-button" disabled>
        {ADMIN_EMPTY_VALUE}
      </button>
    );
  }
  const userId = call.userId;
  return (
    <button
      type="button"
      className="admin-button"
      onClick={() => onSelectUser(userId)}
    >
      {userId}
    </button>
  );
}

function toColumns(
  onSelectUser: (userId: string) => void,
): readonly AdminColumn<AdminAiCall>[] {
  return [
    {
      key: "requestedAt",
      header: "requestedAt (KST)",
      render: (call) => formatAdminDateTime(call.requestedAt),
    },
    { key: "purpose", render: (call) => toAdminAiPurposeLabel(call.purpose) },
    { key: "surface" },
    {
      key: "outcome",
      render: (call) => (
        <span
          className={`admin-badge admin-badge--${toAdminAiOutcomeTone(
            call.outcome,
          )}`}
        >
          {toAdminAiOutcomeLabel(call.outcome)}
        </span>
      ),
    },
    { key: "fallbackReason" },
    { key: "model", render: (call) => toAdminAiModelLabel(call.model) },
    { key: "inputTokens" },
    { key: "outputTokens" },
    { key: "cacheReadInputTokens" },
    { key: "cacheCreationInputTokens" },
    { key: "latencyMs" },
    {
      key: "isDemo",
      render: (call) =>
        call.isDemo === true ? (
          <span className="admin-badge admin-badge--demo">demo</span>
        ) : (
          formatAdminValue(call.isDemo)
        ),
    },
    {
      key: "userId",
      render: (call) => (
        <AdminAiCallUserCell call={call} onSelectUser={onSelectUser} />
      ),
    },
    { key: "errorSummary" },
  ];
}

export function AdminAiCallTable({
  listing,
  currentPage,
  size,
  onChangePage,
  onSelectUser,
}: AdminAiCallTableProps) {
  return (
    <>
      <dl className="admin-kv admin-kv--inline">
        <div className="admin-kv__pair">
          <dt>page</dt>
          <dd>{formatAdminValue(listing.page)}</dd>
        </div>
        <div className="admin-kv__pair">
          <dt>size</dt>
          <dd>{formatAdminValue(listing.size)}</dd>
        </div>
        <div className="admin-kv__pair">
          <dt>totalElements</dt>
          <dd>{formatAdminValue(listing.totalElements)}</dd>
        </div>
        <div className="admin-kv__pair">
          <dt>totalPages</dt>
          <dd>{formatAdminValue(listing.totalPages)}</dd>
        </div>
      </dl>

      <AdminTable
        columns={toColumns(onSelectUser)}
        rows={listing.items}
        getRowKey={(call, index) => `${formatAdminValue(call.id)}-${index}`}
        getRowTone={(call) => (call.model === null ? "muted" : "default")}
        emptyLabel="이 조건에 해당하는 호출이 없습니다."
      />

      <div className="admin-pager">
        <button
          type="button"
          className="admin-button"
          disabled={currentPage === 0}
          onClick={() => onChangePage(currentPage - 1)}
        >
          이전
        </button>
        <span className="admin-pager__label">요청한 page: {currentPage}</span>
        <button
          type="button"
          className="admin-button"
          disabled={!hasAdminNextPage(listing, currentPage, size)}
          onClick={() => onChangePage(currentPage + 1)}
        >
          다음
        </button>
      </div>
    </>
  );
}
