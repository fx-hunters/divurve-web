import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlannerGoalForm } from "./planner-goal-form";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import { presentPlannerPlanSummary } from "./planner-api-presenter";

const previewPlan = presentPlannerPlanSummary({
  ...PLANNER_API_FIXTURE.items[0]!.activePlan!,
  planId: null,
  version: null,
  warnings: ["BUDGET_SHORTFALL"],
});

describe("PlannerGoalForm", () => {
  it("현재 회원 계약에 맞는 마감형 목표 입력을 전달한다", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(
      <PlannerGoalForm
        sourceLabel="내 계정"
        canCreateRecurring={false}
        isPending={false}
        today="2026-09-08"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("radio", { name: /반복형/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /마감형/ }));
    fireEvent.change(screen.getByLabelText("목표 이름 또는 목적"), {
      target: { value: "일본 여행" },
    });
    fireEvent.change(screen.getByLabelText("목표 통화"), {
      target: { value: "JPY" },
    });
    fireEvent.change(screen.getByLabelText("사용 목적"), {
      target: { value: "TUITION" },
    });
    fireEvent.change(screen.getByLabelText("목표 외화 금액"), {
      target: { value: "180000" },
    });
    fireEvent.change(screen.getByLabelText("목표 날짜"), {
      target: { value: "2027-03-01" },
    });
    fireEvent.change(screen.getByLabelText("준비 주기"), {
      target: { value: "biweekly" },
    });
    fireEvent.change(screen.getByLabelText(/월 사용 가능 금액/), {
      target: { value: "300000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "새 목표 만들기" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "일본 여행",
        kind: "deadline",
        purpose: "TUITION",
        currencyCode: "JPY",
        targetAmount: 180000,
        targetDate: "2027-03-01",
        recurInterval: "biweekly",
        budgetAmount: 300000,
        budgetPeriod: "monthly",
      }),
    );
  });

  it("데모에서는 반복형 목표와 회차별 예산을 입력할 수 있다", async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(
      <PlannerGoalForm
        sourceLabel="데모"
        canCreateRecurring
        isPending={false}
        today="2026-09-08"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /반복형/ }));
    fireEvent.click(screen.getByRole("radio", { name: /마감형/ }));
    fireEvent.click(screen.getByRole("radio", { name: /반복형/ }));
    fireEvent.change(screen.getByLabelText("목표 이름 또는 목적"), {
      target: { value: "ETF 준비" },
    });
    fireEvent.change(screen.getByLabelText("목표 외화 금액"), {
      target: { value: "3000" },
    });
    fireEvent.change(screen.getByLabelText("첫 점검 종료일"), {
      target: { value: "2027-09-08" },
    });
    fireEvent.change(screen.getByLabelText("회차별 사용 가능 금액(원)"), {
      target: { value: "200000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "데모 목표 추가" }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "recurring",
          purpose: "STOCK_ACCUMULATION",
          budgetAmount: 200000,
        }),
      ),
    );
  });

  it("유효하지 않은 입력을 안내하고 취소 및 처리 중 상태를 제공한다", () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <PlannerGoalForm
        sourceLabel="내 계정"
        canCreateRecurring={false}
        isPending={false}
        today="2026-09-08"
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "새 목표 만들기" }));
    expect(screen.getByRole("alert")).toHaveTextContent("목표 이름");
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalledOnce();

    rerender(
      <PlannerGoalForm
        sourceLabel="내 계정"
        canCreateRecurring={false}
        isPending
        today="2026-09-08"
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("button", { name: "목표를 저장하는 중…" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("button", { name: "목표를 저장하는 중…" }).closest("form")!);
  });

  it("저장하기 전에 같은 조건으로 계획 계산을 요청한다", async () => {
    const onPreview = vi.fn().mockResolvedValue(true);
    render(
      <PlannerGoalForm
        sourceLabel="내 계정"
        canCreateRecurring={false}
        isPending={false}
        today="2026-09-08"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onPreview={onPreview}
      />,
    );

    fireEvent.change(screen.getByLabelText("목표 이름 또는 목적"), {
      target: { value: "일본 여행" },
    });
    fireEvent.change(screen.getByLabelText("목표 외화 금액"), {
      target: { value: "180000" },
    });
    fireEvent.change(screen.getByLabelText("목표 날짜"), {
      target: { value: "2027-03-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장 전에 계획 보기" }));

    await waitFor(() =>
      expect(onPreview).toHaveBeenCalledWith(
        expect.objectContaining({ name: "일본 여행", targetAmount: 180_000 }),
      ),
    );
  });

  it("조건이 규칙에 어긋나면 계산을 요청하지 않는다", async () => {
    const onPreview = vi.fn();
    render(
      <PlannerGoalForm
        sourceLabel="내 계정"
        canCreateRecurring={false}
        isPending={false}
        today="2026-09-08"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onPreview={onPreview}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "저장 전에 계획 보기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "목표 이름을 입력해 주세요.",
    );
    expect(onPreview).not.toHaveBeenCalled();
  });

  it("계산 결과와 경고를 저장 전에 보여준다", () => {
    render(
      <PlannerGoalForm
        sourceLabel="내 계정"
        canCreateRecurring={false}
        isPending={false}
        today="2026-09-08"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onPreview={vi.fn()}
        preview={previewPlan}
      />,
    );

    expect(
      screen.getByRole("region", { name: "저장 전 계획 미리보기" }),
    ).toBeInTheDocument();
    expect(screen.getByText("전체 회차")).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "미리보기 경고" }),
    ).toHaveTextContent("예산이 계획 비용에 미치지 못합니다");
  });

  it("예산 상태와 경고가 없으면 그 칸을 그리지 않는다", () => {
    render(
      <PlannerGoalForm
        sourceLabel="내 계정"
        canCreateRecurring={false}
        isPending={false}
        today="2026-09-08"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onPreview={vi.fn()}
        preview={{
          ...previewPlan,
          budgetStateLabel: null,
          estimatedCostLabel: null,
          warnings: [],
        }}
      />,
    );

    expect(screen.queryByText("예산 상태")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "미리보기 경고" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("서버 응답에 없음")).toBeInTheDocument();
  });

  it("요청 중에는 미리보기 버튼을 누를 수 없다", () => {
    const onPreview = vi.fn();
    render(
      <PlannerGoalForm
        sourceLabel="내 계정"
        canCreateRecurring={false}
        isPending
        today="2026-09-08"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onPreview={onPreview}
      />,
    );

    expect(screen.getByRole("button", { name: "계산하는 중…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "계산하는 중…" }));
    expect(onPreview).not.toHaveBeenCalled();
  });

  it("반복형을 고르면 저장 전 계산 버튼을 감춘다", () => {
    render(
      <PlannerGoalForm
        sourceLabel="데모"
        canCreateRecurring
        isPending={false}
        today="2026-09-08"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onPreview={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /반복형/ }));
    expect(
      screen.queryByRole("button", { name: "저장 전에 계획 보기" }),
    ).not.toBeInTheDocument();
  });
});
