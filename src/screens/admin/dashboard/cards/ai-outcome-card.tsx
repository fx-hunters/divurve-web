/**
 * AI 결과 분해 카드 (이슈 #101).
 *
 * 결과 5종을 각각 서버가 센다. `fallback`을 실패로 칠하지 않는 것은
 * `admin-ai-call-vocabulary.ts` 가 이미 정해 둔 판단이다 — 사용자에게는 템플릿
 * 문장이 나갔고, 아무것도 얻지 못한 `error`와는 다른 사실이다.
 *
 * `quota_blocked`는 실패도 성공도 아니지만 **사용자에게는 서비스가 막힌 것**이라
 * 따로 보인다.
 *
 * 실패 비율과 템플릿 경고는 원래 옆의 `AI 호출` 카드에 있었다. 그 카드가 총
 * 건수·error·fallback 을 세는데 이 카드가 다섯 종을 모두 세므로 상위 집합이었고,
 * 같은 숫자가 두 카드에 찍혀 보는 사람이 "둘이 왜 다른가" 를 먼저 의심하게 됐다.
 * 잃을 정보 없이 여기로 합쳤다(이슈 #108).
 */
import { useCallback, useEffect } from "react";
import {
  ADMIN_AI_OUTCOMES,
  fetchAdminAiCalls,
  type AdminAiCallPage,
} from "../../../../api/admin";
import {
  toAdminAiOutcomeLabel,
  toAdminAiOutcomeTone,
} from "../../admin-ai-call-vocabulary";
import { formatAdminValue } from "../../admin-value";
import { useAdminRequest } from "../../use-admin-request";
import {
  formatFailureRate,
  isAllFallback,
  toOutcomeWidth,
} from "../admin-dashboard-presenter";
import { AdminMetricCard } from "../admin-metric-card";
import {
  COUNT_ONLY_PAGE,
  dataOf,
  errorOf,
  isLoadingOf,
  type AdminCardProps,
} from "./card-state";

/** 결과 하나를 세는 훅. 종류마다 요청이 하나씩 나간다. */
function useOutcomeCount(
  outcome: string,
  onAuthFailure: AdminCardProps["onAuthFailure"],
) {
  const request = useAdminRequest<[], AdminAiCallPage>(
    useCallback(
      () => fetchAdminAiCalls({ ...COUNT_ONLY_PAGE, outcome }),
      [outcome],
    ),
    onAuthFailure,
  );
  const { send } = request;
  useEffect(() => {
    void send();
  }, [send]);
  return request;
}

export function AiOutcomeCard({ onAuthFailure }: AdminCardProps) {
  const total = useAdminRequest<[], AdminAiCallPage>(
    useCallback(() => fetchAdminAiCalls(COUNT_ONLY_PAGE), []),
    onAuthFailure,
  );
  const { send: sendTotal } = total;
  useEffect(() => {
    void sendTotal();
  }, [sendTotal]);

  // 훅 호출 수를 고정하기 위해 어휘 상수를 그대로 편다(Rules of Hooks).
  const success = useOutcomeCount(ADMIN_AI_OUTCOMES[0], onAuthFailure);
  const fallback = useOutcomeCount(ADMIN_AI_OUTCOMES[1], onAuthFailure);
  const cacheHit = useOutcomeCount(ADMIN_AI_OUTCOMES[2], onAuthFailure);
  const quotaBlocked = useOutcomeCount(ADMIN_AI_OUTCOMES[3], onAuthFailure);
  const errored = useOutcomeCount(ADMIN_AI_OUTCOMES[4], onAuthFailure);

  const totalCount = dataOf(total.state)?.totalElements ?? null;
  const slices = [success, fallback, cacheHit, quotaBlocked, errored].map(
    (request, index) => ({
      outcome: ADMIN_AI_OUTCOMES[index]!,
      count: dataOf(request.state)?.totalElements ?? null,
    }),
  );
  const fallbackCount = dataOf(fallback.state)?.totalElements ?? null;
  const errorCount = dataOf(errored.state)?.totalElements ?? null;

  return (
    <AdminMetricCard
      title="AI 결과 분해"
      headline={`${formatAdminValue(totalCount)}건`}
      tone={errorCount !== null && errorCount > 0 ? "warn" : "neutral"}
      isLoading={isLoadingOf(total.state)}
      error={errorOf(total.state)}
    >
      <ul className="admin-outcome-list">
        {slices.map((slice) => {
          const width = toOutcomeWidth(slice.count, totalCount);
          return (
            <li className="admin-outcome-row" key={slice.outcome}>
              <span className="admin-outcome-row__label">
                {toAdminAiOutcomeLabel(slice.outcome)}
              </span>
              <span className="admin-outcome-row__track">
                {width !== null && (
                  <span
                    className={`admin-outcome-row__bar admin-outcome-row__bar--${toAdminAiOutcomeTone(
                      slice.outcome,
                    )}`}
                    style={{ width: `${width}%` }}
                  />
                )}
              </span>
              <span className="admin-outcome-row__count">
                {formatAdminValue(slice.count)}건
              </span>
            </li>
          );
        })}
      </ul>
      <dl className="admin-kv admin-kv--inline">
        <div className="admin-kv__pair">
          <dt>실패 비율</dt>
          <dd>{formatFailureRate(errorCount, totalCount)}</dd>
        </div>
      </dl>
      {isAllFallback(fallbackCount, totalCount) && (
        <p className="admin-empty">
          모든 호출이 템플릿으로 나갔습니다. 실 API 가 꺼져 있으면 정상입니다.
        </p>
      )}
    </AdminMetricCard>
  );
}
