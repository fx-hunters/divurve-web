import { describe, expect, it } from "vitest";
import type { AdminFxPairCoverage } from "../../api/admin-fx-gaps";
import {
  formatCoverageRatio,
  toCoverageTone,
  toDayNumber,
  toGapSegments,
} from "./admin-fx-gap-presenter";

function coverageOf(
  overrides: Partial<AdminFxPairCoverage> = {},
): AdminFxPairCoverage {
  return {
    pairCode: "USDKRW",
    rateType: "mid",
    from: "2026-01-01",
    to: "2026-01-10",
    expectedBusinessDays: 8,
    coveredBusinessDays: 8,
    missingBusinessDays: 0,
    coverageRatio: 1,
    complete: true,
    gaps: [],
    ...overrides,
  };
}

describe("toDayNumber", () => {
  it("YYYY-MM-DD 를 일수로 바꾼다", () => {
    expect(toDayNumber("1970-01-01")).toBe(0);
    expect(toDayNumber("1970-01-11")).toBe(10);
  });

  it("형식이 아니거나 비었으면 null", () => {
    expect(toDayNumber(null)).toBeNull();
    expect(toDayNumber("2026-1-1")).toBeNull();
    expect(toDayNumber("어제")).toBeNull();
    expect(toDayNumber("2026-13-45")).toBeNull();
  });
});

describe("toGapSegments", () => {
  it("빠진 구간을 조회 구간 안의 비율 자리로 옮긴다", () => {
    // 1/1~1/10 은 10일. 1/1~1/2 는 앞에서 두 칸.
    const segments = toGapSegments(
      coverageOf({
        gaps: [{ from: "2026-01-01", to: "2026-01-02", businessDays: 2 }],
      }),
    );

    expect(segments).toHaveLength(1);
    expect(segments[0]!.leftPercent).toBe(0);
    expect(segments[0]!.widthPercent).toBe(20);
    expect(segments[0]!.businessDays).toBe(2);
  });

  it("구간 중간에 있는 결측도 자리를 지킨다", () => {
    const segments = toGapSegments(
      coverageOf({
        gaps: [{ from: "2026-01-06", to: "2026-01-06", businessDays: 1 }],
      }),
    );

    expect(segments[0]!.leftPercent).toBe(50);
    expect(segments[0]!.widthPercent).toBe(10);
  });

  it("하루짜리 구간도 보이도록 최소 너비를 준다", () => {
    const segments = toGapSegments(
      coverageOf({
        from: "2026-01-01",
        to: "2027-01-01",
        gaps: [{ from: "2026-06-01", to: "2026-06-01", businessDays: 1 }],
      }),
    );

    expect(segments[0]!.widthPercent).toBeGreaterThanOrEqual(0.5);
  });

  it("조회 구간을 모르면 자리를 지어내지 않는다", () => {
    expect(
      toGapSegments(
        coverageOf({
          from: null,
          gaps: [{ from: "2026-01-01", to: "2026-01-02", businessDays: 2 }],
        }),
      ),
    ).toEqual([]);
    expect(
      toGapSegments(
        coverageOf({
          to: null,
          gaps: [{ from: "2026-01-01", to: "2026-01-02", businessDays: 2 }],
        }),
      ),
    ).toEqual([]);
  });

  it("조회 구간이 뒤집혀 있으면 그리지 않는다", () => {
    expect(
      toGapSegments(
        coverageOf({
          from: "2026-01-10",
          to: "2026-01-01",
          gaps: [{ from: "2026-01-02", to: "2026-01-03", businessDays: 2 }],
        }),
      ),
    ).toEqual([]);
  });

  it("날짜가 빠진 구간은 건너뛴다", () => {
    const segments = toGapSegments(
      coverageOf({
        gaps: [
          { from: null, to: "2026-01-02", businessDays: 1 },
          { from: "2026-01-03", to: null, businessDays: 1 },
          { from: "2026-01-04", to: "2026-01-05", businessDays: 2 },
        ],
      }),
    );

    expect(segments).toHaveLength(1);
    expect(segments[0]!.from).toBe("2026-01-04");
  });

  it("조회 구간 밖으로 나간 결측은 띠 안으로 눌러 담는다", () => {
    const segments = toGapSegments(
      coverageOf({
        gaps: [{ from: "2025-12-01", to: "2026-02-01", businessDays: 40 }],
      }),
    );

    expect(segments[0]!.leftPercent).toBe(0);
    expect(segments[0]!.widthPercent).toBe(100);
  });
});

describe("formatCoverageRatio", () => {
  it("비율을 소수 한 자리 퍼센트로 적는다", () => {
    expect(formatCoverageRatio(1)).toBe("100.0%");
    expect(formatCoverageRatio(0.9047)).toBe("90.5%");
  });

  it("값이 없으면 대시", () => {
    expect(formatCoverageRatio(null)).toBe("-");
  });
});

describe("toCoverageTone", () => {
  it("완전 여부를 색조로 옮긴다", () => {
    expect(toCoverageTone(coverageOf({ complete: true }))).toBe("complete");
    expect(toCoverageTone(coverageOf({ complete: false }))).toBe("incomplete");
    expect(toCoverageTone(coverageOf({ complete: null }))).toBe("unknown");
  });
});
