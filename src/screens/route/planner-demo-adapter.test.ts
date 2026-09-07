import { beforeAll, describe, expect, it } from "vitest";
import { loadRoutePlan } from "../../api/route";
import type { RoutePlanData } from "../../types/route";
import {
  presentDemoPlanner,
  presentDemoScenarioComparison,
} from "./planner-demo-adapter";

let data: RoutePlanData;

beforeAll(async () => {
  const loaded = await loadRoutePlan();
  if (loaded === null) throw new Error("데모 플래너 fixture가 필요합니다.");
  data = loaded;
});

describe("planner demo adapter", () => {
  it("두 fixture 목표를 공통 ViewModel과 데모 출처로 변환한다", () => {
    const model = presentDemoPlanner(data);
    expect(model.goalItems).toHaveLength(2);
    expect(model.goalItems.map((goal) => goal.name)).toEqual([
      "미국 ETF 정기 투자",
      "일본 여행 준비",
    ]);
    expect(model.dataSource).toEqual({ kind: "demo", label: "데모 데이터" });
    expect(model.selectedGoal).toMatchObject({
      id: "usd-etf-recurring-demo",
      targetAmount: null,
      heldAmount: null,
      progressPercent: 42,
    });
    expect(model.curve?.viewBox).toBe("0 0 100 100");
    expect(model.curve?.path).toMatch(/^M 8 82\.22/);
    expect(model.scenarioOptions).toHaveLength(5);
  });

  it("선택 목표와 적용 시나리오의 기존 Curve 표시값을 보존한다", () => {
    const model = presentDemoPlanner(
      data,
      "jpy-travel-deadline-demo",
      "rapidRise",
    );
    expect(model.selectedGoal?.name).toBe("일본 여행 준비");
    expect(model.nextAction).toMatchObject({
      amountLabel: "35,000 JPY",
      title: "첫 마감 보호 회차 확인",
    });
    expect(model.curve?.accessibleLabel).toContain("대체 계획 경로");
    expect(model.supportedActions.canPreviewScenario).toBe(true);
  });

  it("데모 기록 뒤에는 다음 확인 문구를 사용하고 완료 action을 막는다", () => {
    const model = presentDemoPlanner(
      data,
      "usd-etf-recurring-demo",
      "expectedRange",
      true,
    );
    expect(model.nextAction).toMatchObject({
      title: "상황 확인 노드 살펴보기",
      amountLabel: "응답 갱신 확인",
    });
    expect(model.steps.find((step) => step.sequence === 2)?.status).toBe(
      "completed",
    );
    expect(model.supportedActions.canCompleteStep).toBe(false);
  });

  it("현재·알 수 없는 상황은 비교를 만들지 않고 대체 상황만 비교한다", () => {
    expect(
      presentDemoScenarioComparison(
        data,
        "usd-etf-recurring-demo",
        "expectedRange",
      ),
    ).toBeNull();
    expect(
      presentDemoScenarioComparison(
        data,
        "usd-etf-recurring-demo",
        "unknown",
      ),
    ).toBeNull();
    const comparison = presentDemoScenarioComparison(
      data,
      "usd-etf-recurring-demo",
      "missedRound",
    );
    expect(comparison).toMatchObject({
      id: "missedRound",
      draftPlanId: "missedRound",
    });
    expect(comparison?.alternativeCurve).not.toBeNull();
    expect(comparison?.changedNodeIds).toContain("usd-next");
  });

  it("알 수 없는 목표 식별자는 첫 데모 목표로 안전하게 돌아간다", () => {
    expect(presentDemoPlanner(data, "unknown").selectedGoal?.id).toBe(
      "usd-etf-recurring-demo",
    );
  });
});
