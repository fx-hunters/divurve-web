import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "./client";
import {
  completePlanStep,
  fetchPlannerOverview,
  skipPlanStep,
} from "./planner";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, request: vi.fn() };
});

const goal = (id: string) => ({
  id,
  name: id,
  kind: "deadline",
  purpose: "travel",
  currencyCode: "USD",
  targetAmount: 100,
  isSpeculative: false,
  status: "active",
  heldAmount: 10,
});

describe("planner API", () => {
  beforeEach(() => vi.mocked(request).mockReset());

  it("목록을 조회하고 각 목표의 활성 계획을 URL 인코딩해 조회한다", async () => {
    vi.mocked(request)
      .mockResolvedValueOnce({ goals: [goal("a/b"), goal("two")] })
      .mockResolvedValueOnce({ id: "plan-1", steps: [] })
      .mockResolvedValueOnce({ id: "plan-2", steps: [] });
    await expect(fetchPlannerOverview()).resolves.toEqual({
      items: [
        { goal: goal("a/b"), activePlan: { id: "plan-1", steps: [] } },
        { goal: goal("two"), activePlan: { id: "plan-2", steps: [] } },
      ],
    });
    expect(request).toHaveBeenCalledWith("/api/v1/goals");
    expect(request).toHaveBeenCalledWith("/api/v1/goals/a%2Fb/plans/active");
    expect(request).toHaveBeenCalledWith("/api/v1/goals/two/plans/active");
  });

  it("활성 계획의 404만 계획 없음으로 바꾼다", async () => {
    vi.mocked(request)
      .mockResolvedValueOnce({ goals: [goal("missing")] })
      .mockRejectedValueOnce(new ApiError("없음", 404));
    await expect(fetchPlannerOverview()).resolves.toEqual({
      items: [{ goal: goal("missing"), activePlan: null }],
    });
  });

  it("활성 계획의 다른 오류는 전파한다", async () => {
    const error = new ApiError("서버 오류", 500);
    vi.mocked(request)
      .mockResolvedValueOnce({ goals: [goal("error")] })
      .mockRejectedValueOnce(error);
    await expect(fetchPlannerOverview()).rejects.toBe(error);
  });

  it("완료와 건너뛰기 요청을 인코딩된 경로와 서버 입력으로 전송한다", async () => {
    vi.mocked(request).mockResolvedValue({});
    await completePlanStep("plan/a", 2, {
      executedAmount: 10,
      executedRate: 1400,
    });
    await skipPlanStep("plan/a", 3);
    expect(request).toHaveBeenNthCalledWith(
      1,
      "/api/v1/plans/plan%2Fa/steps/2/complete",
      { method: "POST", body: { executedAmount: 10, executedRate: 1400 } },
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/api/v1/plans/plan%2Fa/steps/3/skip",
      { method: "POST" },
    );
  });
});
