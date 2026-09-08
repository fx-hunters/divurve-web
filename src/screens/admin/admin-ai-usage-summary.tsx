/**
 * AI 사용량 집계 표.
 *
 * props만 받는 표현 컴포넌트다(AGENTS.md 7.2). 합계·비율·금액을 여기서
 * 만들지 않는다 — 서버가 준 칸을 그대로 세운다.
 */
import type { AdminAiUsageBucket } from "../../api/admin";
import {
  toAdminAiModelLabel,
  toAdminAiPurposeLabel,
} from "./admin-ai-call-vocabulary";
import { AdminTable, type AdminColumn } from "./admin-table";
import { formatAdminValue } from "./admin-value";

/**
 * 실 호출이 한 건도 없는 집계인지.
 *
 * `ANTHROPIC_ENABLED`가 꺼진 기본 설정에서는 모든 칸이 이 상태이며, 이것이
 * **정상**이다. 표가 0으로 채워진 것을 API 미연결로 오해하기 가장 쉬운
 * 지점이라 안내를 따로 띄운다.
 */
function hasNoLiveAiCall(
  buckets: readonly AdminAiUsageBucket[],
): boolean {
  return buckets.length > 0 && buckets.every((bucket) => bucket.model === null);
}

const COLUMNS: readonly AdminColumn<AdminAiUsageBucket>[] = [
  { key: "day", header: "day (UTC 기준)" },
  {
    key: "purpose",
    render: (bucket) => toAdminAiPurposeLabel(bucket.purpose),
  },
  { key: "model", render: (bucket) => toAdminAiModelLabel(bucket.model) },
  { key: "calls" },
  { key: "inputTokens" },
  { key: "outputTokens" },
];

export function AdminAiUsageSummaryTable({
  buckets,
}: {
  readonly buckets: readonly AdminAiUsageBucket[];
}) {
  return (
    <>
      {hasNoLiveAiCall(buckets) && (
        <p className="admin-panel admin-panel--idle">
          이 기간에는 LLM을 부른 호출이 없습니다. 실 API가 꺼져 있으면 모든
          서술이 템플릿으로 나가므로 토큰 0·비용 0이 정상입니다. 연동이 끊긴
          상태가 아닙니다.
        </p>
      )}
      <AdminTable
        columns={COLUMNS}
        rows={buckets}
        getRowKey={(bucket, index) =>
          `${formatAdminValue(bucket.day)}-${formatAdminValue(
            bucket.purpose,
          )}-${formatAdminValue(bucket.model)}-${index}`
        }
        getRowTone={(bucket) => (bucket.model === null ? "muted" : "default")}
        emptyLabel="이 기간에 집계된 호출이 없습니다."
      />
    </>
  );
}
