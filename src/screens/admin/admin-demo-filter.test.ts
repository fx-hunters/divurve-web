import { describe, expect, it } from "vitest";
import { toIsDemoParam } from "./admin-demo-filter";

describe("toIsDemoParam", () => {
  it("전체는 파라미터를 보내지 않는다", () => {
    expect(toIsDemoParam("all")).toBeUndefined();
    expect(toIsDemoParam("demoOnly")).toBe(true);
    expect(toIsDemoParam("memberOnly")).toBe(false);
  });
});
