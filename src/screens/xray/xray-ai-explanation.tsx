/**
 * 내 자산(X-ray) 화면에 붙는 AI 자연어 설명 컨테이너.
 *
 * 데이터 취득은 공용 훅(`useAiExplanation`)이, 표현은 공용 컴포넌트
 * (`AiExplanation`)가 맡는다. 이 파일은 두 탭이 같은 방식으로 설명을 붙이도록
 * 지면(surface)·제목·근거 수치만 이어 준다(AGENTS.md §7.2).
 *
 * 근거 수치(facts)가 비면 훅이 요청하지 않고 idle로 남고, 표현 컴포넌트는
 * 아무것도 그리지 않는다. 서버가 빈 facts에 400을 주기 때문이다.
 */
import { AiExplanation } from "../../components/ai/ai-explanation";
import { Spinner } from "../../components/common/spinner";
import {
  useAiExplanation,
  type ExplanationFacts,
  type ExplanationRequester,
} from "../../hooks/use-ai-explanation";

/** 설명이 붙는 지면. 백엔드와 리터럴이 같아야 한다(AGENTS.md §4). */
export const XRAY_EXPOSURE_SURFACE = "xray_exposure";
export const XRAY_FITNESS_SURFACE = "xray_fitness";

const SPINNER_SIZE = 20;

interface XRayAiExplanationProps {
  readonly surface: string;
  readonly title: string;
  readonly facts: ExplanationFacts | null;
  /** 테스트·데모에서 요청 경로를 갈아 끼우는 주입 지점. */
  readonly requester?: ExplanationRequester;
}

export function XRayAiExplanation({
  surface,
  title,
  facts,
  requester,
}: XRayAiExplanationProps) {
  const { state, reload } = useAiExplanation({ surface, facts, requester });

  return (
    <AiExplanation
      state={state}
      title={title}
      onRetry={reload}
      loadingIndicator={<Spinner size={SPINNER_SIZE} />}
    />
  );
}
