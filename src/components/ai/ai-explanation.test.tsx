import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AiExplanationState } from "../../hooks/use-ai-explanation";
import { AiExplanation } from "./ai-explanation";

function successState(
  overrides: {
    readonly sentences?: readonly string[];
    readonly fallback?: boolean | null;
    readonly numericMatch?: boolean | null;
  } = {},
): AiExplanationState {
  return {
    status: "success",
    explanation: {
      sentences: overrides.sentences ?? [
        "지금 환율은 최근 3개월 범위 안에 있습니다.",
        "목표 금액의 절반이 채워졌습니다.",
      ],
      sentenceCount: 2,
      explainLevel: "basic",
      explainDomain: "fx",
      fallback: overrides.fallback ?? false,
    },
    verification: {
      numericMatch: overrides.numericMatch ?? true,
      regimeDisclosed: true,
      blockedPhrases: [],
      fallbackReason: null,
    },
    meta: { asOf: "2026-09-08T00:00:00Z" },
  };
}

const GENERAL_GUIDANCE_LABEL =
  "수치 대조를 통과하지 못해 일반 안내 문장으로 표시했습니다.";

describe("AiExplanation", () => {
  it("idle이면 아무것도 그리지 않는다", () => {
    const { container } = render(<AiExplanation state={{ status: "idle" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("성공했지만 문장이 없으면 빈 영역을 만들지 않는다", () => {
    const { container } = render(
      <AiExplanation state={successState({ sentences: [] })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("로딩이면 기본 표시 요소와 진행 문구를 보여준다", () => {
    const { container } = render(
      <AiExplanation state={{ status: "loading" }} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "설명을 정리하는 중입니다.",
    );
    expect(
      container.querySelector(".ai-explanation__indicator"),
    ).not.toBeNull();
  });

  it("로딩 표시 요소를 주입하면 기본 요소 대신 그린다", () => {
    const { container } = render(
      <AiExplanation
        state={{ status: "loading" }}
        loadingIndicator={<span data-testid="injected-indicator" />}
      />,
    );

    expect(screen.getByTestId("injected-indicator")).toBeInTheDocument();
    expect(container.querySelector(".ai-explanation__indicator")).toBeNull();
  });

  it("에러면 메시지를 알리고 재시도 버튼으로 다시 요청한다", () => {
    const onRetry = vi.fn();
    render(
      <AiExplanation
        state={{ status: "error", message: "설명을 불러오지 못했습니다." }}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "설명을 불러오지 못했습니다.",
    );
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("재시도 핸들러가 없으면 버튼을 그리지 않는다", () => {
    render(
      <AiExplanation state={{ status: "error", message: "불러오지 못했습니다." }} />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("성공이면 서버가 준 문장을 그대로 나열하고 보조 라벨은 붙이지 않는다", () => {
    render(<AiExplanation state={successState()} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(
      screen.getByText("지금 환율은 최근 3개월 범위 안에 있습니다."),
    ).toBeInTheDocument();
    expect(screen.queryByText(GENERAL_GUIDANCE_LABEL)).toBeNull();
  });

  it.each([
    ["fallback=true", { fallback: true }],
    ["numericMatch=false", { numericMatch: false }],
  ])("%s면 일반 안내 문장임을 표시한다", (_label, overrides) => {
    render(<AiExplanation state={successState(overrides)} />);
    expect(screen.getByText(GENERAL_GUIDANCE_LABEL)).toBeInTheDocument();
  });

  it("제목과 추가 클래스를 바꿀 수 있다", () => {
    const { container } = render(
      <AiExplanation
        state={successState()}
        title="이 화면 설명"
        className="home-card__ai"
      />,
    );

    expect(screen.getByRole("region", { name: "이 화면 설명" })).toBeInTheDocument();
    expect(
      container.querySelector(".ai-explanation.home-card__ai"),
    ).not.toBeNull();
  });
});
