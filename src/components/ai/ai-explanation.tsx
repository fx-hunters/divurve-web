/**
 * AI 자연어 설명 표현 컴포넌트.
 *
 * 표현 전용이다 — props로 받은 상태만 그린다. 직접 fetch하거나 전역에
 * 접근하지 않는다(AGENTS.md §7.2). 데이터는 `useAiExplanation` 훅이 만든다.
 *
 * 서버가 준 문장은 손대지 않고 그대로 렌더한다. 컴포넌트가 스스로 만드는
 * 고정 문구에는 금지어(예측·추천·보장)를 쓰지 않는다(§6).
 */
import { useId, type ReactNode } from "react";
import type { AiExplanationState } from "../../hooks/use-ai-explanation";
import "./ai-explanation.css";

const DEFAULT_TITLE = "AI 설명";
const LOADING_LABEL = "설명을 정리하는 중입니다.";
const RETRY_LABEL = "다시 시도";
const COLLAPSE_LABEL = "접기";
const EXPAND_LABEL = "펼치기";
/** fallback·수치 불일치일 때 문장의 성격을 알리는 보조 라벨. */
const GENERAL_GUIDANCE_LABEL =
  "수치 대조를 통과하지 못해 일반 안내 문장으로 표시했습니다.";

export interface AiExplanationProps {
  readonly state: AiExplanationState;
  /** 영역 제목. 화면마다 다르게 붙일 수 있다. */
  readonly title?: string;
  /** 에러 상태에서 재시도 버튼을 붙인다. 없으면 버튼을 그리지 않는다. */
  readonly onRetry?: () => void;
  /**
   * 로딩 표시를 바깥에서 주입한다.
   *
   * 공용 스피너(`components/common/spinner.tsx`)는 별도 이슈 산출물이라 아직
   * 이 브랜치에 없다. 기본값으로 내부의 작은 표시 요소를 쓰고, 공용 스피너가
   * 들어오면 이 prop으로 넘겨 교체한다.
   */
  readonly loadingIndicator?: ReactNode;
  /**
   * 접기/펼치기. 핸들러를 주면 버튼이 붙고, 없으면 늘 펼친 상태다 —
   * 화면마다 접기가 필요한 것은 아니다.
   *
   * 상태를 이 컴포넌트가 들고 있지 않은 이유: 접고 펴면 형제 요소의 높이가
   * 달라져 부모 카드의 배치가 바뀐다. 그 배치를 아는 쪽이 상태를 들어야
   * 부모까지 다시 그려진다(AGENTS.md §7.5).
   */
  readonly isOpen?: boolean;
  readonly onToggle?: () => void;
  readonly className?: string;
}

/** 문장이 검증을 통과한 맞춤 설명인지, 일반 안내 문장인지 가른다. */
function isGeneralGuidance(
  state: Extract<AiExplanationState, { status: "success" }>,
): boolean {
  return (
    state.explanation.fallback === true || state.verification.numericMatch === false
  );
}

export function AiExplanation({
  state,
  title = DEFAULT_TITLE,
  onRetry,
  loadingIndicator,
  isOpen = true,
  onToggle,
  className = "",
}: AiExplanationProps) {
  const bodyId = useId();

  // 근거 수치가 아직 없으면(idle) 자리만 차지하는 빈 영역을 만들지 않는다.
  if (state.status === "idle") return null;
  if (state.status === "success" && state.explanation.sentences.length === 0) {
    return null;
  }

  return (
    <section className={`ai-explanation ${className}`.trim()} aria-label={title}>
      <div className="ai-explanation__header">
        <h3 className="ai-explanation__title">{title}</h3>
        {onToggle !== undefined && (
          <button
            type="button"
            className="ai-explanation__toggle"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={bodyId}
          >
            {isOpen ? COLLAPSE_LABEL : EXPAND_LABEL}
          </button>
        )}
      </div>

      <div className="ai-explanation__body" id={bodyId} hidden={!isOpen}>
        {state.status === "loading" && (
          <p className="ai-explanation__status" role="status">
            {loadingIndicator ?? (
              <span className="ai-explanation__indicator" aria-hidden="true" />
            )}
            <span>{LOADING_LABEL}</span>
          </p>
        )}

        {state.status === "error" && (
          <div className="ai-explanation__error" role="alert">
            <p className="ai-explanation__message">{state.message}</p>
            {onRetry !== undefined && (
              <button
                type="button"
                className="ai-explanation__retry"
                onClick={onRetry}
              >
                {RETRY_LABEL}
              </button>
            )}
          </div>
        )}

        {state.status === "success" && (
          <>
            <ul className="ai-explanation__sentences">
              {state.explanation.sentences.map((sentence, index) => (
                <li className="ai-explanation__sentence" key={`${index}-${sentence}`}>
                  {sentence}
                </li>
              ))}
            </ul>
            {isGeneralGuidance(state) && (
              <p className="ai-explanation__notice" data-variant="general-guidance">
                {GENERAL_GUIDANCE_LABEL}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
