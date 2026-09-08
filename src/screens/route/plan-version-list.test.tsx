import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlanResponse } from "../../api/generated/divurve-api";
import type { PlanVersion } from "../../api/planner";
import { PlanVersionList } from "./plan-version-list";
import type {
  PlanVersionDetailState,
  PlanVersionsState,
} from "./use-plan-versions";

const VERSIONS: readonly PlanVersion[] = [
  {
    planId: "plan-2",
    version: 2,
    status: "active",
    reason: "재계산",
    planEndDate: "2026-12-31",
    createdAt: "2026-09-01T00:00:00Z",
  },
  // 백엔드가 새 상태를 추가하면 라벨 없이도 원문이 보여야 한다
  { planId: "plan-1", version: 1, status: "unknown-status" as never },
];

/** 백엔드 `PlanResponse` 구조 그대로. 저장된 계획이라 warnings 는 빈 배열이다. */
const PLAN_DETAIL: PlanResponse = {
  planId: "plan-2",
  goalId: "goal-usd",
  version: 2,
  goal: {
    goalType: "deadline",
    purpose: "investment",
    currencyCode: "USD",
    targetAmount: 3_000,
    allocatedHoldingAmount: 1_260,
    remainingAmount: 1_740,
    targetDate: "2026-12-31",
  },
  summary: {
    status: "active",
    planEndDate: "2026-12-26",
    totalRounds: 4,
    completedRounds: 1,
    scheduledRounds: 2,
    skippedRounds: 1,
    nextActionSeq: 2,
  },
  steps: [
    {
      seq: 1,
      scheduledDate: "2026-09-01",
      amount: 145,
      executedAmount: 145,
      status: "completed",
      nextAction: false,
    },
    {
      seq: 2,
      scheduledDate: "2026-09-12",
      amount: 145,
      executedAmount: 0,
      status: "due",
      nextAction: true,
    },
    {
      seq: 3,
      scheduledDate: "2026-09-19",
      amount: 145,
      executedAmount: 0,
      status: "scheduled",
      nextAction: false,
    },
    {
      seq: 4,
      scheduledDate: "2026-09-26",
      amount: 145,
      executedAmount: 0,
      // 백엔드가 새 회차 상태를 추가해도 원문이 그대로 보여야 한다
      status: "brand-new-status" as never,
      nextAction: false,
    },
  ],
  warnings: [],
  disclaimer: "이 계획은 조건부 계산 결과입니다.",
};

function renderList(
  state: PlanVersionsState,
  detailState: PlanVersionDetailState = { status: "idle" },
) {
  const onRetry = vi.fn();
  const onSelect = vi.fn();
  const onCloseDetail = vi.fn();
  render(
    <PlanVersionList
      state={state}
      detailState={detailState}
      currencyCode="USD"
      onRetry={onRetry}
      onSelect={onSelect}
      onCloseDetail={onCloseDetail}
    />,
  );
  return { onRetry, onSelect, onCloseDetail };
}

describe("PlanVersionList", () => {
  it("로딩·빈 상태를 각각 렌더한다", () => {
    renderList({ status: "loading" });
    expect(
      screen.getByText("계획 이력을 불러오고 있습니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "계획 이력 불러오는 중" }),
    ).toBeInTheDocument();

    renderList({ status: "empty" });
    expect(screen.getByText(/저장된 계획 버전이 없습니다/)).toBeInTheDocument();
  });

  it("목록 오류에 다시 시도 버튼을 붙인다", () => {
    const { onRetry } = renderList({
      status: "error",
      message: "계획 이력 오류",
    });
    expect(screen.getByRole("alert")).toHaveTextContent("계획 이력 오류");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("버전 행을 렌더하고 선택·닫기를 상위로 알린다", () => {
    const { onSelect, onCloseDetail } = renderList({
      status: "success",
      versions: VERSIONS,
    });

    expect(screen.getByText("v2")).toBeInTheDocument();
    expect(screen.getByText("적용 중")).toBeInTheDocument();
    // 알 수 없는 상태 값은 서버가 준 문자열 그대로 보여 준다
    expect(screen.getByText("unknown-status")).toBeInTheDocument();
    expect(screen.getByText("종료 2026-12-31")).toBeInTheDocument();
    expect(screen.getByText("생성 2026-09-01T00:00:00Z")).toBeInTheDocument();

    const rows = screen.getAllByRole("button");
    expect(rows[0]).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(rows[0]!);
    expect(onSelect).toHaveBeenCalledWith("plan-2");
    expect(onCloseDetail).not.toHaveBeenCalled();

    renderList(
      { status: "success", versions: VERSIONS },
      { status: "loading", planId: "plan-2" },
    );
    const openRows = screen.getAllByRole("button", { expanded: true });
    fireEvent.click(openRows[openRows.length - 1]!);
  });

  it("선택한 버전의 상세를 로딩·오류·성공으로 나눠 렌더한다", () => {
    renderList(
      { status: "success", versions: VERSIONS },
      { status: "loading", planId: "plan-2" },
    );
    expect(
      screen.getByText("계획 상세를 불러오고 있습니다."),
    ).toBeInTheDocument();

    const errorView = renderList(
      { status: "success", versions: VERSIONS },
      { status: "error", planId: "plan-1", message: "상세 오류" },
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("상세 오류");
    fireEvent.click(within(alert).getByRole("button", { name: "다시 시도" }));
    expect(errorView.onSelect).toHaveBeenCalledWith("plan-1");

    renderList(
      { status: "success", versions: VERSIONS },
      { status: "success", planId: "plan-2", plan: PLAN_DETAIL },
    );
    expect(screen.getByText("전체 회차")).toBeInTheDocument();
    expect(screen.getByText("1회차")).toBeInTheDocument();
    expect(screen.getByText("2026-09-01 · 145 USD")).toBeInTheDocument();
    expect(screen.getByText("완료")).toBeInTheDocument();
    // 백엔드 PlanStepStatus 어휘가 라벨로 나온다 (예전엔 없던 scheduled·due)
    expect(screen.getByText("예정일 도래")).toBeInTheDocument();
    expect(screen.getByText("예정")).toBeInTheDocument();
    // 알 수 없는 회차 상태도 서버 값 그대로 표시한다
    expect(screen.getByText("brand-new-status")).toBeInTheDocument();
  });
});
