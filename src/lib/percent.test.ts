import { describe, expect, it } from "vitest";
import { toPercent } from "./percent";

describe("toPercent", () => {
  it("비율을 소수 첫째 자리 퍼센트로 바꾼다", () => {
    expect(toPercent(0.7512)).toBe(75.1);
    expect(toPercent(0.6666)).toBe(66.7);
    expect(toPercent(0)).toBe(0);
  });

  it("소수 둘째 자리에서 반올림한다", () => {
    expect(toPercent(0.12345)).toBe(12.3);
    expect(toPercent(0.12355)).toBe(12.4);
  });

  it("1을 넘거나 음수인 비율도 같은 규칙으로 변환한다", () => {
    expect(toPercent(1)).toBe(100);
    expect(toPercent(-0.0512)).toBe(-5.1);
  });
});
