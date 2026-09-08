import { describe, expect, it } from "vitest";
import {
  ADMIN_AI_CALL_DEFAULT_RANGE_DAYS,
  toDefaultAiCallRange,
  toInitialAiCallFilters,
  toUtcDateInputValue,
  toUtcRangeEnd,
  toUtcRangeStart,
} from "./admin-ai-call-query";

describe("toUtcDateInputValue", () => {
  it("서울이 아니라 UTC 기준으로 끊는다", () => {
    // 서울에서는 이미 9월 8일이지만 UTC로는 아직 7일이다.
    expect(toUtcDateInputValue(new Date("2026-09-08T00:30:00+09:00"))).toBe(
      "2026-09-07",
    );
  });
});

describe("toDefaultAiCallRange", () => {
  it("오늘을 포함해 7일을 잡는다", () => {
    expect(ADMIN_AI_CALL_DEFAULT_RANGE_DAYS).toBe(7);
    expect(toDefaultAiCallRange(new Date("2026-09-08T12:00:00Z"))).toEqual({
      from: "2026-09-02",
      to: "2026-09-08",
    });
  });
});

describe("toUtcRangeStart / toUtcRangeEnd", () => {
  it("빈 값이면 조건을 걸지 않는다", () => {
    expect(toUtcRangeStart("")).toBeUndefined();
    expect(toUtcRangeEnd("")).toBeUndefined();
  });

  it("날짜를 그 날의 시작과 끝으로 옮긴다", () => {
    expect(toUtcRangeStart("2026-09-08")).toBe("2026-09-08T00:00:00Z");
    expect(toUtcRangeEnd("2026-09-08")).toBe("2026-09-08T23:59:59.999Z");
  });

  it("형식이 어긋난 값은 그대로 넘겨 서버가 판정하게 둔다", () => {
    expect(toUtcRangeStart("2026-9-8")).toBe("2026-9-8");
    expect(toUtcRangeEnd("어제")).toBe("어제");
  });
});

describe("toInitialAiCallFilters", () => {
  it("최근 7일만 걸고 나머지 조건은 비워 둔다", () => {
    expect(toInitialAiCallFilters(new Date("2026-09-08T12:00:00Z"))).toEqual({
      from: "2026-09-02",
      to: "2026-09-08",
      purpose: "",
      outcome: "",
      surface: "",
      demo: "all",
    });
  });
});
