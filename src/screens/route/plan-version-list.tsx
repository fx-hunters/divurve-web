/**
 * 계획 버전 이력 목록.
 *
 * 표현 전용이다 — props로 받은 상태만 그린다(AGENTS.md §7.2). 로딩·빈·에러를
 * 각각 렌더하고(§7.8), 로딩 표시는 공용 스피너를 쓴다.
 */
import { Badge } from "../../components/common/badge";
import { Spinner } from "../../components/common/spinner";
import type {
  PlanStatusCode,
  PlanStepStatusCode,
} from "../../api/generated/divurve-api";
import type { PlanVersion } from "../../api/planner";
import type {
  PlanVersionDetailState,
  PlanVersionsState,
} from "./use-plan-versions";

interface PlanVersionListProps {
  readonly state: PlanVersionsState;
  readonly detailState: PlanVersionDetailState;
  readonly currencyCode: string;
  readonly onRetry: () => void;
  readonly onSelect: (planId: string) => void;
  readonly onCloseDetail: () => void;
}

/**
 * 라벨 표. 리터럴 유니온 키를 **모두** 요구하므로 백엔드가 값을 추가하면
 * 컴파일 에러가 난다. 인덱스 시그니처를 함께 두어, 그럼에도 모르는 코드가
 * 도착하면 원문을 그대로 노출한다 — 조용히 삼키지 않는다.
 */
type LabelTable<Code extends string> = Readonly<Record<Code, string>> &
  Readonly<Record<string, string | undefined>>;

/** 백엔드 `PlanStatus` 리터럴을 화면 문구로 옮긴다. 값은 서버 계약 그대로다. */
const STATUS_LABELS: LabelTable<PlanStatusCode> = {
  draft: "계산됨",
  active: "적용 중",
  needs_review: "재검토 필요",
  completed: "완료",
  paused: "일시 정지",
  superseded: "대체됨",
};

/**
 * 백엔드 `PlanStepStatus` 리터럴(`scheduled·due·completed·skipped`).
 *
 * 예전 이 표에 있던 `pending` 은 백엔드에 존재하지 않는 값이었고, 실제로 오는
 * `scheduled`·`due` 에는 라벨이 없어 원문 코드가 노출됐다(점검 리포트 M4).
 */
const STEP_STATUS_LABELS: LabelTable<PlanStepStatusCode> = {
  scheduled: "예정",
  due: "예정일 도래",
  completed: "완료",
  skipped: "건너뜀",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function stepStatusLabel(status: string): string {
  return STEP_STATUS_LABELS[status] ?? status;
}

const amountFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 2,
});

function PlanVersionRow({
  version,
  currencyCode,
  detailState,
  onSelect,
  onCloseDetail,
}: {
  readonly version: PlanVersion;
  readonly currencyCode: string;
  readonly detailState: PlanVersionDetailState;
  readonly onSelect: (planId: string) => void;
  readonly onCloseDetail: () => void;
}) {
  const isOpen =
    detailState.status !== "idle" && detailState.planId === version.planId;

  return (
    <li className="plan-version-list__item" data-status={version.status}>
      <button
        type="button"
        className="plan-version-list__summary"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? onCloseDetail() : onSelect(version.planId))}
      >
        <span className="plan-version-list__version">v{version.version}</span>
        <span className="plan-version-list__labels">
          <Badge variant={version.status === "active" ? "primary" : "default"}>
            {statusLabel(version.status)}
          </Badge>
          {version.reason !== undefined && <small>{version.reason}</small>}
        </span>
        <span className="plan-version-list__dates">
          {version.planEndDate !== undefined && (
            <span>종료 {version.planEndDate}</span>
          )}
          {version.createdAt !== undefined && (
            <span>생성 {version.createdAt}</span>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="plan-version-list__detail">
          {detailState.status === "loading" && (
            <p className="plan-version-list__pending">
              <Spinner size={20} label="계획 상세 불러오는 중" />
              <span>계획 상세를 불러오고 있습니다.</span>
            </p>
          )}

          {detailState.status === "error" && (
            <div className="plan-version-list__error" role="alert">
              <span>{detailState.message}</span>
              <button type="button" onClick={() => onSelect(version.planId)}>
                다시 시도
              </button>
            </div>
          )}

          {detailState.status === "success" && (
            <>
              <dl className="plan-version-list__facts">
                <div>
                  <dt>전체 회차</dt>
                  <dd>{detailState.plan.summary.totalRounds}</dd>
                </div>
                <div>
                  <dt>완료 회차</dt>
                  <dd>{detailState.plan.summary.completedRounds}</dd>
                </div>
                <div>
                  <dt>건너뛴 회차</dt>
                  <dd>{detailState.plan.summary.skippedRounds}</dd>
                </div>
              </dl>
              <ol className="plan-version-list__steps">
                {detailState.plan.steps.map((step) => (
                  <li key={step.seq}>
                    <strong>{step.seq}회차</strong>
                    <span>
                      {step.scheduledDate} ·{" "}
                      {amountFormatter.format(step.amount)} {currencyCode}
                    </span>
                    <small>{stepStatusLabel(step.status)}</small>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export function PlanVersionList({
  state,
  detailState,
  currencyCode,
  onRetry,
  onSelect,
  onCloseDetail,
}: PlanVersionListProps) {
  return (
    <section className="plan-version-list" aria-label="계획 버전 이력">
      {state.status === "loading" && (
        <p className="plan-version-list__pending">
          <Spinner size={20} label="계획 이력 불러오는 중" />
          <span>계획 이력을 불러오고 있습니다.</span>
        </p>
      )}

      {state.status === "empty" && (
        <p className="plan-version-list__empty">
          저장된 계획 버전이 없습니다. 계획을 만들면 이곳에 버전이 쌓입니다.
        </p>
      )}

      {state.status === "error" && (
        <div className="plan-version-list__error" role="alert">
          <span>{state.message}</span>
          <button type="button" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      )}

      {state.status === "success" && (
        <ol className="plan-version-list__items">
          {state.versions.map((version) => (
            <PlanVersionRow
              key={version.planId}
              version={version}
              currencyCode={currencyCode}
              detailState={detailState}
              onSelect={onSelect}
              onCloseDetail={onCloseDetail}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
