import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlannerGoalForm } from "./planner-goal-form";

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
});
