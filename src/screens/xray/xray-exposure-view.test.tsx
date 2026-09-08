import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExplainResult } from "../../api/ai-explain";
import { ApiError, type ApiResult } from "../../api/client";
import {
  NOT_MEASURED_XRAY_API_FIXTURE,
  STRESS_RUN_FIXTURE,
  XRAY_API_FIXTURE,
} from "../../test/api-fixtures";
import type { ExplanationRequester } from "../../hooks/use-ai-explanation";
import { toStressRunResult, toXRayDashboardData } from "./xray-presenter";
import { currencyColor, XRayExposureView } from "./xray-exposure-view";

const DATA = toXRayDashboardData(XRAY_API_FIXTURE);
const RUN_RESULT = toStressRunResult(STRESS_RUN_FIXTURE);

// 화면 자체를 보는 기존 테스트에서는 AI 설명을 로딩 상태로 묶어 둔다.
const PENDING_REQUESTER: ExplanationRequester = () => new Promise(() => {});

describe("currencyColor", () => {
  it("USD·JPY·EUR은 고정 색을, 그 밖의 통화는 중립색을 쓴다", () => {
    expect(currencyColor("USD")).toBe("var(--usd)");
    expect(currencyColor("JPY")).toBe("var(--jpy)");
    expect(currencyColor("EUR")).toBe("var(--eur)");
    expect(currencyColor("GBP")).toBe("var(--text-muted)");
  });
});

describe("XRayExposureView", () => {
  it("외화 비중, 통화 노출, 손익 분해, 시나리오 목록을 렌더링한다", () => {
    render(
      <XRayExposureView
        data={DATA}
        selectedScenarioCode=""
        runState={{ status: "idle" }}
        runResult={null}
        onSelectScenario={vi.fn()}
        explanationRequester={PENDING_REQUESTER}
      />,
    );

    expect(screen.getByRole("heading", { name: "외화 비중" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "통화별 노출" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "환율 민감도" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "손익 분해" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "스트레스 시나리오" })).toBeInTheDocument();

    expect(screen.getByText("₩ 8,000,000")).toBeInTheDocument();
    expect(screen.getByText("₩ 12,000,000")).toBeInTheDocument();
    expect(screen.getByText("USD 75%")).toBeInTheDocument();
    expect(screen.getByText("JPY 25%")).toBeInTheDocument();
    expect(screen.getByText("기준선 60%")).toBeInTheDocument();
    expect(screen.getByTestId("concentration-threshold-marker")).toBeInTheDocument();
    expect(screen.getByText("+₩ 80,000")).toBeInTheDocument();

    expect(screen.getByText("자산 가격 효과")).toBeInTheDocument();
    expect(screen.getByText("5.8%p")).toBeInTheDocument();
    expect(screen.getByText("-0.4%p")).toBeInTheDocument();
    expect(screen.getByText("0%p")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("+15%")).toBeInTheDocument();
    expect(screen.getByText("-2%")).toBeInTheDocument();
    expect(
      screen.getByText("시나리오를 고르면 서버가 계산한 충격 결과를 보여줍니다."),
    ).toBeInTheDocument();
  });

  it("시나리오를 고르면 코드를 넘긴다", () => {
    const onSelectScenario = vi.fn();
    render(
      <XRayExposureView
        data={DATA}
        selectedScenarioCode="equity_down_krw_weak"
        runState={{ status: "running" }}
        runResult={null}
        onSelectScenario={onSelectScenario}
        explanationRequester={PENDING_REQUESTER}
      />,
    );

    // AI 설명 로딩 표시도 role="status"라 문구로 직접 집는다.
    expect(screen.getByText("시나리오를 계산하는 중입니다.")).toHaveAttribute(
      "role",
      "status",
    );
    expect(
      screen.getByRole("button", { name: "주가 하락 + 원화 약세" }),
    ).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "주가 하락 + 원화 강세" }));
    expect(onSelectScenario).toHaveBeenCalledWith("equity_down_krw_strong");
  });

  it("시나리오 실행 결과와 실패 메시지를 각각 보여준다", () => {
    const { unmount } = render(
      <XRayExposureView
        data={DATA}
        selectedScenarioCode="equity_down_krw_weak"
        runState={{ status: "done" }}
        runResult={RUN_RESULT}
        onSelectScenario={vi.fn()}
        explanationRequester={PENDING_REQUESTER}
      />,
    );
    expect(screen.getByText("주가 -20%, 환율 +10% 충격 가정")).toBeInTheDocument();
    expect(screen.getByText("₩ -520,000")).toBeInTheDocument();
    expect(screen.getByText("충격 후 외화 자산 ₩ 7,480,000")).toBeInTheDocument();
    unmount();

    render(
      <XRayExposureView
        data={DATA}
        selectedScenarioCode="equity_down_krw_weak"
        runState={{ status: "error", message: "계산 실패" }}
        runResult={null}
        onSelectScenario={vi.fn()}
        explanationRequester={PENDING_REQUESTER}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("계산 실패");
  });

  it("기준선이 없고 종목이 없는 계정은 마커와 목록을 비운다", () => {
    render(
      <XRayExposureView
        data={toXRayDashboardData(NOT_MEASURED_XRAY_API_FIXTURE)}
        selectedScenarioCode=""
        runState={{ status: "idle" }}
        runResult={null}
        onSelectScenario={vi.fn()}
        explanationRequester={PENDING_REQUESTER}
      />,
    );
    expect(
      screen.queryByTestId("concentration-threshold-marker"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/기준선/)).not.toBeInTheDocument();
    expect(screen.getByText("등록된 종목이 없습니다.")).toBeInTheDocument();
  });
});

const EXPLAIN_SENTENCE = "외화 자산 비중은 40%입니다.";

function explainResult(
  overrides: { readonly fallback?: boolean } = {},
): ApiResult<ExplainResult> {
  return {
    data: {
      explanation: {
        sentences: [EXPLAIN_SENTENCE],
        sentenceCount: 1,
        explainLevel: "basic",
        explainDomain: "fx",
        fallback: overrides.fallback ?? false,
      },
      verification: {
        numericMatch: true,
        regimeDisclosed: true,
        blockedPhrases: [],
        fallbackReason: null,
      },
    },
    meta: { asOf: "2026-09-08T00:00:00Z" },
  };
}

describe("XRayExposureView의 AI 설명", () => {
  it("통화 노출 지면과 엔진 값 그대로의 근거 수치로 요청한다", async () => {
    const requester = vi.fn().mockResolvedValue(explainResult());
    render(
      <XRayExposureView
        data={DATA}
        selectedScenarioCode=""
        runState={{ status: "idle" }}
        runResult={null}
        onSelectScenario={vi.fn()}
        explanationRequester={requester}
      />,
    );

    expect(await screen.findByText(EXPLAIN_SENTENCE)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "통화 노출 AI 설명" }),
    ).toBeInTheDocument();
    expect(requester).toHaveBeenCalledWith({
      surface: "xray_exposure",
      facts: {
        total_asset_krw: 20_000_000,
        fx_asset_krw: 8_000_000,
        krw_asset_krw: 12_000_000,
        // 비율은 0~1 스케일로 보낸다 — 백엔드 수치 대조기가 서술의 "%" 토큰을
        // 100으로 나눠 비교하기 때문이다.
        fx_ratio: 0.4,
        exposure: [
          { currency_code: "USD", krw: 6_000_000, share: 0.75 },
          { currency_code: "JPY", krw: 2_000_000, share: 0.25 },
        ],
        fx_sensitivity_1pct_krw: 80_000,
        total_return: 0.09,
        concentration_status: "above_threshold",
        concentration_threshold: 0.6,
      },
    });
  });

  it("요청 중에는 공용 스피너와 진행 문구를 보여준다", () => {
    render(
      <XRayExposureView
        data={DATA}
        selectedScenarioCode=""
        runState={{ status: "idle" }}
        runResult={null}
        onSelectScenario={vi.fn()}
        explanationRequester={PENDING_REQUESTER}
      />,
    );

    expect(screen.getByText("설명을 정리하는 중입니다.")).toBeInTheDocument();
    expect(screen.getByLabelText("불러오는 중")).toBeInTheDocument();
  });

  it("실패하면 메시지를 보여주고 다시 요청할 수 있다", async () => {
    const requester = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError("설명을 만들지 못했습니다.", 503, "UNAVAILABLE"),
      )
      .mockResolvedValue(explainResult());
    render(
      <XRayExposureView
        data={DATA}
        selectedScenarioCode=""
        runState={{ status: "idle" }}
        runResult={null}
        onSelectScenario={vi.fn()}
        explanationRequester={requester}
      />,
    );

    expect(
      await screen.findByText("설명을 만들지 못했습니다."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText(EXPLAIN_SENTENCE)).toBeInTheDocument();
    expect(requester).toHaveBeenCalledTimes(2);
  });

  it("노출 목록이 비면 요청하지 않고 설명 영역도 만들지 않는다", () => {
    const requester = vi.fn();
    render(
      <XRayExposureView
        data={toXRayDashboardData(NOT_MEASURED_XRAY_API_FIXTURE)}
        selectedScenarioCode=""
        runState={{ status: "idle" }}
        runResult={null}
        onSelectScenario={vi.fn()}
        explanationRequester={requester}
      />,
    );

    expect(requester).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "통화 노출 AI 설명" }),
    ).not.toBeInTheDocument();
  });
});
