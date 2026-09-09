import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PLANNER_API_FIXTURE } from "../../test/api-fixtures";
import { presentPlannerOverview } from "./planner-api-presenter";
import { PlannerGoalEditForm } from "./planner-goal-edit-form";
import {
  toGoalUpdateRequest,
  type PlannerGoalEditDraft,
} from "./planner-goal-edit-input";

const goal = presentPlannerOverview(PLANNER_API_FIXTURE).selectedGoal!;

const initial: PlannerGoalEditDraft = {
  name: "미국 ETF 준비",
  targetAmount: "5000",
  targetDate: "2027-03-01",
  budgetAmount: "500000",
};

function renderForm(overrides: Partial<Parameters<typeof PlannerGoalEditForm>[0]> = {}) {
  const onSave = vi.fn().mockResolvedValue(true);
  const onDelete = vi.fn().mockResolvedValue(true);
  const onBack = vi.fn();
  const rendered = render(
    <PlannerGoalEditForm
      goal={goal}
      initial={initial}
      isPending={false}
      today="2026-09-09"
      onSave={onSave}
      onDelete={onDelete}
      onBack={onBack}
      {...overrides}
    />,
  );
  return { ...rendered, onSave, onDelete, onBack };
}

describe("toGoalUpdateRequest", () => {
  it("달라진 항목만 담는다", () => {
    expect(
      toGoalUpdateRequest(initial, { ...initial, targetAmount: "7000" }),
    ).toEqual({ targetAmount: 7_000 });
  });

  it("네 항목이 모두 바뀌면 모두 담고 이름은 다듬는다", () => {
    expect(
      toGoalUpdateRequest(initial, {
        name: "  새 이름  ",
        targetAmount: "8000",
        targetDate: "2027-06-01",
        budgetAmount: "700000",
      }),
    ).toEqual({
      name: "새 이름",
      targetAmount: 8_000,
      targetDate: "2027-06-01",
      budgetAmount: 700_000,
    });
  });

  it("바뀐 값이 없으면 null이다", () => {
    expect(toGoalUpdateRequest(initial, initial)).toBeNull();
  });
});

describe("PlannerGoalEditForm", () => {
  it("바꾼 항목만 저장 요청에 싣는다", async () => {
    const { onSave } = renderForm();

    fireEvent.change(screen.getByLabelText("목표 외화 금액"), {
      target: { value: "7000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "바뀐 조건 저장" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ targetAmount: 7_000 }),
    );
  });

  it("바뀐 값이 없으면 요청을 보내지 않고 알린다", async () => {
    const { onSave } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "바뀐 조건 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "바뀐 값이 없습니다.",
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it.each([
    ["name", "목표 이름 또는 목적", "  ", "목표 이름을 입력해 주세요."],
    [
      "targetAmount",
      "목표 외화 금액",
      "0",
      "목표 외화 금액은 0보다 큰 값으로 입력해 주세요.",
    ],
    [
      "targetDate",
      "목표 날짜",
      "2020-01-01",
      "오늘 이후의 목표 날짜를 선택해 주세요.",
    ],
    [
      "budgetAmount",
      "월 사용 가능 금액(원)",
      "-1",
      "사용 가능 금액은 0 이상의 원화 금액으로 입력해 주세요.",
    ],
  ])("%s 값이 규칙에 어긋나면 저장하지 않는다", async (_key, label, value, message) => {
    const { onSave } = renderForm();

    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "바뀐 조건 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("삭제는 확인을 한 번 더 받고 실행한다", async () => {
    const { onDelete } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "이 목표 지우기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "되돌릴 수 없습니다",
    );
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "목표 지우기" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledOnce());
  });

  it("확인을 물린 뒤에는 삭제 버튼만 남는다", () => {
    const { onDelete } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "이 목표 지우기" }));
    fireEvent.click(screen.getByRole("button", { name: "그대로 두기" }));

    expect(
      screen.getByRole("button", { name: "이 목표 지우기" }),
    ).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("요청 중에 제출이 들어와도 다시 부르지 않는다", () => {
    // 버튼은 이미 비활성이지만, Enter 제출 같은 경로가 남아 있어 핸들러도 막는다.
    const { onSave, container } = renderForm({ isPending: true });

    fireEvent.submit(container.querySelector("form")!);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("삭제 요청 중에는 진행 문구를 보여준다", () => {
    const { rerender, onDelete } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "이 목표 지우기" }));
    rerender(
      <PlannerGoalEditForm
        goal={goal}
        initial={initial}
        isPending
        today="2026-09-09"
        onSave={vi.fn()}
        onDelete={onDelete}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "지우는 중…" })).toBeDisabled();
  });

  it("현재 상태로 돌아가는 이동을 위임한다", () => {
    const { onBack } = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "현재 상태로" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
