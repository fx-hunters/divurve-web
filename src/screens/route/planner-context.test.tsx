import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RouteContextData } from "../../api/route-context";
import { presentPlannerContext } from "./planner-context-presenter";
import { PlannerContextStrip } from "./planner-context-strip";
import { usePlannerContext } from "./use-planner-context";

const FULL: RouteContextData = {
  asOf: "2026-09-09T00:00:00Z",
  diagnosis: {
    status: "done",
    grade: "B",
    score: 72,
    concentrationThreshold: 0.4,
  },
  portfolio: {
    totalAssetKrw: 120_000_000,
    fxAssetKrw: 30_000_000,
    fxRatio: 0.253,
    exposure: { USD: 0.7 },
  },
  forecast: {
    pairCode: "USD/KRW",
    baseRate: 1_380.5,
    interval80: { lo: 1_340.2, hi: 1_420.8 },
    vol30d: 0.08,
    baseDate: "2026-09-08",
  },
  stress: { lastRunId: "run-1", totalEffectKrw: -1_200_000 },
  regime: "normal",
};

const EMPTY: RouteContextData = {
  asOf: null,
  diagnosis: null,
  portfolio: null,
  forecast: null,
  stress: null,
  regime: null,
};

describe("presentPlannerContext", () => {
  it("서버가 준 값을 문구로만 옮긴다", () => {
    const view = presentPlannerContext(FULL);

    expect(view.facts).toEqual([
      { id: "diagnosis", label: "진단 등급", value: "B" },
      { id: "fxRatio", label: "외화 비중", value: "25.3%" },
      {
        id: "baseRate",
        label: "USD/KRW 기준 환율",
        value: "1,380.5 (80% 구간 1,340.2~1,420.8)",
      },
      { id: "regime", label: "시장 국면", value: "보통 변동" },
    ]);
    expect(view.asOfLabel).toBe("2026-09-08");
  });

  it("값이 없는 항목은 지어내지 않고 빼 버린다", () => {
    const view = presentPlannerContext(EMPTY);

    expect(view.facts).toEqual([]);
    expect(view.asOfLabel).toBeNull();
  });

  it("구간이 없으면 기준 환율만 적고, 통화쌍이 없으면 일반 문구를 쓴다", () => {
    const view = presentPlannerContext({
      ...EMPTY,
      forecast: {
        pairCode: null,
        baseRate: 1_400,
        interval80: null,
        vol30d: null,
        baseDate: null,
      },
      regime: "unknown-code",
    });

    expect(view.facts).toEqual([
      { id: "baseRate", label: "기준 환율", value: "1,400" },
      // 모르는 국면 코드는 삼키지 않고 원문 그대로 노출한다.
      { id: "regime", label: "시장 국면", value: "unknown-code" },
    ]);
  });

  it("환율 기준일이 없으면 응답 기준 시각으로 대신한다", () => {
    const view = presentPlannerContext({
      ...EMPTY,
      asOf: "2026-09-09T00:00:00Z",
      regime: "high",
    });

    expect(view.asOfLabel).toBe("2026-09-09T00:00:00Z");
  });
});

describe("PlannerContextStrip", () => {
  it("항목과 기준 시각을 표시한다", () => {
    render(<PlannerContextStrip context={presentPlannerContext(FULL)} />);

    expect(
      screen.getByRole("region", { name: "계획 배경 정보" }),
    ).toBeInTheDocument();
    expect(screen.getByText("외화 비중")).toBeInTheDocument();
    expect(screen.getByText("25.3%")).toBeInTheDocument();
    expect(
      screen.getByText(/계획 계산과 같은 환율 전제입니다/),
    ).toBeInTheDocument();
  });

  it("표시할 값이 없으면 빈 껍데기를 그리지 않는다", () => {
    const { container } = render(
      <PlannerContextStrip context={presentPlannerContext(EMPTY)} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("기준 시각이 없으면 안내 문구를 생략한다", () => {
    render(
      <PlannerContextStrip
        context={{
          facts: [{ id: "regime", label: "시장 국면", value: "보통 변동" }],
          asOfLabel: null,
        }}
      />,
    );

    expect(screen.getByText("보통 변동")).toBeInTheDocument();
    expect(
      screen.queryByText(/계획 계산과 같은 환율 전제입니다/),
    ).not.toBeInTheDocument();
  });
});

describe("usePlannerContext", () => {
  it("성공하면 받은 컨텍스트를 그대로 담는다", async () => {
    // 로더는 렌더마다 같은 참조여야 한다 — 매번 새 함수를 넘기면 효과가 다시 돈다.
    const load = vi.fn().mockResolvedValue(FULL);
    const { result } = renderHook(() => usePlannerContext(load));

    expect(result.current.status).toBe("loading");
    await waitFor(() =>
      expect(result.current).toEqual({ status: "success", data: FULL }),
    );
  });

  it("실패해도 화면을 막지 않고 사용 불가로만 남긴다", async () => {
    const load = vi.fn().mockRejectedValue(new Error("조회 실패"));
    const { result } = renderHook(() => usePlannerContext(load));

    await waitFor(() =>
      expect(result.current).toEqual({ status: "unavailable" }),
    );
  });

  it("정리된 뒤 도착한 응답은 상태를 바꾸지 않는다", async () => {
    let resolveLoad: (value: RouteContextData) => void = () => undefined;
    const load = vi.fn(
      () =>
        new Promise<RouteContextData>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const { result, unmount } = renderHook(() => usePlannerContext(load));

    unmount();
    resolveLoad(FULL);
    await waitFor(() => expect(result.current.status).toBe("loading"));
  });
});
