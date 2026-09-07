import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import {
  FIT_PREVIEW_FIXTURE,
  STRESS_RUN_FIXTURE,
  XRAY_API_FIXTURE,
} from "../../test/api-fixtures";
import type { XRayDependencies } from "./use-xray";
import { XRayScreen } from "./xray-screen";

function makeDependencies(
  overrides: Partial<XRayDependencies> = {},
): XRayDependencies {
  return {
    loadBundle: vi.fn().mockResolvedValue(XRAY_API_FIXTURE),
    runScenario: vi.fn().mockResolvedValue(STRESS_RUN_FIXTURE),
    previewAdjustment: vi.fn().mockResolvedValue(FIT_PREVIEW_FIXTURE),
    ...overrides,
  };
}

describe("XRayScreen", () => {
  it("서브 탭 전환 인터랙션을 정상적으로 처리한다", async () => {
    const onNavigate = vi.fn();
    render(
      <XRayScreen onNavigate={onNavigate} dependencies={makeDependencies()} />,
    );

    expect(
      await screen.findByRole("heading", { name: "외화 비중" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "통화 적합도" }));
    expect(screen.getByRole("heading", { name: "집중도 진단" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "새 통화 목표 만들기" }));
    expect(onNavigate).toHaveBeenCalledWith("planner");

    fireEvent.click(screen.getByRole("button", { name: "통화 노출 · 손익 분해" }));
    expect(screen.getByRole("heading", { name: "외화 비중" })).toBeInTheDocument();
  });

  it("onNavigate prop 없이도 에러 없이 렌더링되고 동작한다", async () => {
    render(<XRayScreen dependencies={makeDependencies()} />);
    expect(
      await screen.findByRole("heading", { name: "외화 비중" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "통화 적합도" }));
    fireEvent.click(screen.getByRole("button", { name: "새 통화 목표 만들기" }));
    expect(screen.getByRole("heading", { name: "집중도 진단" })).toBeInTheDocument();
  });

  it("시나리오를 고르면 서버가 계산한 결과를 보여준다", async () => {
    const runScenario = vi.fn().mockResolvedValue(STRESS_RUN_FIXTURE);
    render(<XRayScreen dependencies={makeDependencies({ runScenario })} />);
    await screen.findByRole("heading", { name: "외화 비중" });

    fireEvent.click(screen.getByRole("button", { name: "주가 하락 + 원화 약세" }));
    expect(
      await screen.findByText("주가 -20%, 환율 +10% 충격 가정"),
    ).toBeInTheDocument();
    expect(runScenario).toHaveBeenCalledWith({
      scenarioCode: "equity_down_krw_weak",
    });
  });

  it("비중 조정 결과를 요청해 보여준다", async () => {
    const previewAdjustment = vi.fn().mockResolvedValue(FIT_PREVIEW_FIXTURE);
    render(<XRayScreen dependencies={makeDependencies({ previewAdjustment })} />);
    await screen.findByRole("heading", { name: "외화 비중" });

    fireEvent.click(screen.getByRole("button", { name: "통화 적합도" }));
    fireEvent.click(screen.getByRole("button", { name: "조정 결과 보기" }));
    expect(await screen.findByText("68%")).toBeInTheDocument();
    expect(previewAdjustment).toHaveBeenCalledWith({
      currencyCode: "JPY",
      deltaShare: 0.1,
    });
  });

  it("불러오는 중에는 로딩 안내를 보여준다", () => {
    render(
      <XRayScreen
        dependencies={makeDependencies({
          loadBundle: vi.fn().mockReturnValue(new Promise(() => {})),
        })}
      />,
    );
    expect(screen.getByText("내 자산을 불러오는 중입니다")).toBeInTheDocument();
  });

  it("실패하면 메시지와 재시도 버튼을 보여준다", async () => {
    const loadBundle = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("점검 중입니다.", 503, "UNAVAILABLE"))
      .mockResolvedValue(XRAY_API_FIXTURE);
    render(<XRayScreen dependencies={makeDependencies({ loadBundle })} />);

    expect(await screen.findByText("점검 중입니다.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /다시/ }));
    expect(
      await screen.findByRole("heading", { name: "외화 비중" }),
    ).toBeInTheDocument();
  });

  it("등록된 자산이 없으면 빈 상태를 보여준다", async () => {
    render(
      <XRayScreen
        dependencies={makeDependencies({
          loadBundle: vi.fn().mockResolvedValue({
            ...XRAY_API_FIXTURE,
            overview: { ...XRAY_API_FIXTURE.overview, totalAssetKrw: 0 },
          }),
        })}
      />,
    );
    expect(await screen.findByText("등록된 자산이 없습니다")).toBeInTheDocument();
  });
});
