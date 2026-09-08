import { describe, expect, it } from "vitest";
import { normalizePlannerDate, presentPlannerCurve } from "./planner-curve-presenter";

const input = {
  currencyCode: "USD",
  allocatedAmount: 100,
  currentDate: "2026-09-08T09:00:00Z",
  targetAmount: 300,
  targetDate: "2026-10-08",
  steps: [
    {
      id: "one",
      sequence: 1,
      scheduledDate: "2026-09-01",
      plannedAmount: 20,
      executedAmount: 15,
      executedDate: "2026-09-02",
      status: "completed" as const,
    },
    {
      id: "two",
      sequence: 2,
      scheduledDate: "2026-09-18",
      plannedAmount: 40,
      executedAmount: 0,
      executedDate: null,
      status: "next" as const,
    },
    {
      id: "three",
      sequence: 3,
      scheduledDate: "2026-10-01",
      plannedAmount: 50,
      executedAmount: 0,
      executedDate: null,
      status: "upcoming" as const,
    },
  ],
};

describe("planner curve presenter", () => {
  it("실제 날짜 간격과 완료·예정 금액을 누적해 서로 다른 선으로 만든다", () => {
    const curve = presentPlannerCurve(input)!;
    expect(curve.currentPoint).toMatchObject({
      date: "2026-09-08",
      amount: 115,
    });
    expect(curve.nodes.map((node) => node.cumulativeAmount)).toEqual([
      115,
      155,
      205,
    ]);
    expect(curve.nodes[1]!.x - curve.nodes[0]!.x).toBeLessThan(
      curve.nodes[2]!.x - curve.nodes[0]!.x,
    );
    expect(curve.actualPath).toContain("L");
    expect(curve.plannedPath).toContain("L");
    expect(curve.path).not.toContain("C");
    expect(curve.destination).toMatchObject({
      targetAmountLabel: "300 USD",
    });
    expect(curve.plannedPath).not.toContain(
      `${curve.destination!.x.toFixed(2)} ${curve.destination!.y.toFixed(2)}`,
    );
  });

  it("건너뜀은 누적 금액을 늘리지 않고 목표점에 맞춘 금액을 만들지 않는다", () => {
    const curve = presentPlannerCurve({
      ...input,
      steps: [
        input.steps[0]!,
        { ...input.steps[1]!, status: "skipped" as const },
      ],
    })!;
    expect(curve.nodes[1]).toMatchObject({
      roundAmount: 0,
      cumulativeAmount: 115,
      statusLabel: "건너뜀",
    });
    expect(curve.nodes[curve.nodes.length - 1]?.cumulativeAmount).not.toBe(300);
  });

  it("날짜·금액 누락과 지난 예정 회차를 안전하게 표시한다", () => {
    expect(normalizePlannerDate("2026-02-30")).toBeNull();
    expect(normalizePlannerDate("날짜 없음")).toBeNull();
    expect(normalizePlannerDate(null)).toBeNull();
    const curve = presentPlannerCurve({
      ...input,
      allocatedAmount: Number.NaN,
      currentDate: "2026-09-20",
      targetAmount: Number.POSITIVE_INFINITY,
      targetDate: "invalid",
      steps: [
        {
          ...input.steps[1]!,
          plannedAmount: -1,
          scheduledDate: "2026-09-10",
        },
        { ...input.steps[2]!, scheduledDate: "invalid" },
      ],
    })!;
    expect(curve.destination).toBeNull();
    expect(curve.plannedPath).toBeNull();
    expect(curve.dataNotice).toContain("올바르지 않아");
    expect(curve.dataNotice).toContain("지난 예정 회차");
    expect(curve.dataNotice).toContain("날짜를 확인할 수 없는 회차");
  });

  it("사용 가능한 날짜가 하나도 없으면 Curve를 만들지 않는다", () => {
    expect(
      presentPlannerCurve({
        currencyCode: "EUR",
        allocatedAmount: 0,
        currentDate: null,
        targetAmount: null,
        targetDate: null,
        steps: [],
      }),
    ).toBeNull();
  });
});
