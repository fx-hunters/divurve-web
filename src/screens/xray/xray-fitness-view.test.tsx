import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  FIT_PREVIEW_FIXTURE,
  NOT_MEASURED_XRAY_API_FIXTURE,
  XRAY_API_FIXTURE,
} from "../../test/api-fixtures";
import { toXRayDashboardData } from "./xray-presenter";
import { XRayFitnessView } from "./xray-fitness-view";

const DATA = toXRayDashboardData(XRAY_API_FIXTURE);
const NOT_MEASURED_DATA = toXRayDashboardData(NOT_MEASURED_XRAY_API_FIXTURE);

describe("XRayFitnessView", () => {
  it("집중도 진단과 위험성향 등급을 보여준다", () => {
    render(
      <XRayFitnessView
        data={DATA}
        previewState={{ status: "idle" }}
        onPreviewAdjustment={vi.fn()}
        onNavigateToPlanner={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "집중도 진단" })).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(
      screen.getByText(/주력 통화\(USD\) 비중이 전체의 75%입니다/),
    ).toBeInTheDocument();
    expect(screen.getByText(/기준선은 60%입니다/)).toBeInTheDocument();
    expect(screen.getByText(/중립형/)).toBeInTheDocument();
    expect(
      screen.getByText(
        "참고 기준선은 MVP 가설값이며 통계적으로 검증된 배분 기준이 아닙니다.",
      ),
    ).toBeInTheDocument();
  });

  it("기준선 없이 판정만 있는 계정은 기준선 문구를 빼고 보여준다", () => {
    const bundle = {
      ...XRAY_API_FIXTURE,
      fit: {
        ...XRAY_API_FIXTURE.fit,
        riskProfile: { status: "not_measured" },
        concentration: { topCurrencyCode: "USD", share: 0.45, status: "ok" },
        relation: { code: "risk_profile_not_measured", facts: { share: 0.45 } },
      },
    };
    render(
      <XRayFitnessView
        data={toXRayDashboardData(bundle)}
        previewState={{ status: "idle" }}
        onPreviewAdjustment={vi.fn()}
        onNavigateToPlanner={vi.fn()}
      />,
    );
    expect(screen.getByText(/판정: 적정/)).toBeInTheDocument();
    expect(screen.queryByText(/기준선은 \d+%입니다/)).not.toBeInTheDocument();
    expect(screen.getByText(/위험성향을 진단하면/)).toBeInTheDocument();
  });

  it("위험성향 등급이 없으면 등급 줄을 감춘다", () => {
    const bundle = {
      ...XRAY_API_FIXTURE,
      fit: {
        ...XRAY_API_FIXTURE.fit,
        riskProfile: { status: "measured" },
      },
    };
    render(
      <XRayFitnessView
        data={toXRayDashboardData(bundle)}
        previewState={{ status: "idle" }}
        onPreviewAdjustment={vi.fn()}
        onNavigateToPlanner={vi.fn()}
      />,
    );
    expect(screen.queryByText(/위험성향 /)).not.toBeInTheDocument();
    expect(screen.queryByText(/위험성향을 진단하면/)).not.toBeInTheDocument();
  });

  it("진단일이 없으면 등급만 표시한다", () => {
    const bundle = {
      ...XRAY_API_FIXTURE,
      fit: {
        ...XRAY_API_FIXTURE.fit,
        riskProfile: { status: "measured", grade: "B", gradeLabel: "중립형" },
      },
    };
    render(
      <XRayFitnessView
        data={toXRayDashboardData(bundle)}
        previewState={{ status: "idle" }}
        onPreviewAdjustment={vi.fn()}
        onNavigateToPlanner={vi.fn()}
      />,
    );
    expect(screen.getByText("위험성향 중립형")).toBeInTheDocument();
  });

  it("주력 통화를 알 수 없으면 통화 자리를 비우고 후보를 모두 보여준다", () => {
    const bundle = {
      ...XRAY_API_FIXTURE,
      fit: {
        ...XRAY_API_FIXTURE.fit,
        concentration: { share: 0.45, status: "ok" },
      },
    };
    render(
      <XRayFitnessView
        data={toXRayDashboardData(bundle)}
        previewState={{ status: "idle" }}
        onPreviewAdjustment={vi.fn()}
        onNavigateToPlanner={vi.fn()}
      />,
    );
    expect(screen.getByText(/주력 통화\(-\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "USD" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("위험성향 미측정 계정에는 진단 안내를 보여준다", () => {
    render(
      <XRayFitnessView
        data={NOT_MEASURED_DATA}
        previewState={{ status: "idle" }}
        onPreviewAdjustment={vi.fn()}
        onNavigateToPlanner={vi.fn()}
      />,
    );
    expect(
      screen.getByText("집중도를 계산할 자산 정보가 아직 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByText(/위험성향을 진단하면/)).toBeInTheDocument();
  });

  it("플래너로 이동한다", () => {
    const onNavigateToPlanner = vi.fn();
    render(
      <XRayFitnessView
        data={DATA}
        previewState={{ status: "idle" }}
        onPreviewAdjustment={vi.fn()}
        onNavigateToPlanner={onNavigateToPlanner}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "새 통화 목표 만들기" }));
    expect(onNavigateToPlanner).toHaveBeenCalled();
  });

  it("주력 통화를 뺀 후보 통화와 비율로 조정 결과를 요청한다", () => {
    const onPreviewAdjustment = vi.fn();
    render(
      <XRayFitnessView
        data={DATA}
        previewState={{ status: "idle" }}
        onPreviewAdjustment={onPreviewAdjustment}
        onNavigateToPlanner={vi.fn()}
      />,
    );

    // 주력 통화(USD)는 후보에서 빠지고 JPY가 기본 선택된다.
    expect(screen.queryByRole("button", { name: "USD" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "JPY" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "EUR" }));
    fireEvent.change(screen.getByLabelText("EUR 추가 매수 비율"), {
      target: { value: "30" },
    });
    expect(screen.getByText("+30%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "조정 결과 보기" }));
    expect(onPreviewAdjustment).toHaveBeenCalledWith({
      currencyCode: "EUR",
      deltaShare: 0.3,
    });
  });

  it("조정 결과의 진행·실패·완료 상태를 각각 보여준다", () => {
    const { rerender } = render(
      <XRayFitnessView
        data={DATA}
        previewState={{ status: "running" }}
        onPreviewAdjustment={vi.fn()}
        onNavigateToPlanner={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("조정 결과를 계산하는 중입니다.");
    expect(screen.getByRole("button", { name: "조정 결과 보기" })).toBeDisabled();

    rerender(
      <XRayFitnessView
        data={DATA}
        previewState={{ status: "error", message: "계산 불가" }}
        onPreviewAdjustment={vi.fn()}
        onNavigateToPlanner={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("계산 불가");

    rerender(
      <XRayFitnessView
        data={DATA}
        previewState={{ status: "done", preview: FIT_PREVIEW_FIXTURE }}
        onPreviewAdjustment={vi.fn()}
        onNavigateToPlanner={vi.fn()}
      />,
    );
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("68%")).toBeInTheDocument();
    expect(
      screen.getByText("앞으로의 매수만 조정한다고 가정합니다."),
    ).toBeInTheDocument();
  });

  it("서버가 집중도 값을 주지 않으면 조정 전후를 빈 값으로 표시한다", () => {
    render(
      <XRayFitnessView
        data={NOT_MEASURED_DATA}
        previewState={{
          status: "done",
          preview: {
            ...FIT_PREVIEW_FIXTURE,
            concentration: { status: "unknown" },
          },
        }}
        onPreviewAdjustment={vi.fn()}
        onNavigateToPlanner={vi.fn()}
      />,
    );
    expect(screen.getAllByText("-")).toHaveLength(2);
  });
});
