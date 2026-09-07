import { describe, expect, it } from "vitest";
import {
  collectAdminColumns,
  formatAdminJson,
  formatAdminNumber,
  formatAdminValue,
} from "./admin-value";

describe("formatAdminNumber", () => {
  it("천단위만 끊고 소수 자릿수를 그대로 둔다", () => {
    expect(formatAdminNumber(1382.4)).toBe("1,382.4");
    expect(formatAdminNumber(1234567.891234567)).toBe("1,234,567.891234567");
    expect(formatAdminNumber(-1234)).toBe("-1,234");
    expect(formatAdminNumber(999)).toBe("999");
    expect(formatAdminNumber(0)).toBe("0");
  });

  it("자릿수를 끊을 수 없는 값은 손대지 않는다", () => {
    expect(formatAdminNumber(1e21)).toBe("1e+21");
    expect(formatAdminNumber(Number.NaN)).toBe("NaN");
    expect(formatAdminNumber(Number.POSITIVE_INFINITY)).toBe("Infinity");
  });
});

describe("formatAdminValue", () => {
  it("값이 없으면 -로 둔다", () => {
    expect(formatAdminValue(null)).toBe("-");
    expect(formatAdminValue(undefined)).toBe("-");
    expect(formatAdminValue("")).toBe("-");
  });

  it("타입별로 원본을 보존해 보여준다", () => {
    expect(formatAdminValue(1234.5678)).toBe("1,234.5678");
    expect(formatAdminValue(true)).toBe("true");
    expect(formatAdminValue(false)).toBe("false");
    expect(formatAdminValue("ADMIN")).toBe("ADMIN");
    expect(formatAdminValue({ lo: 1, hi: 2 })).toBe('{"lo":1,"hi":2}');
    expect(formatAdminValue([1, 2])).toBe("[1,2]");
  });

  it("JSON으로 만들 수 없는 값도 -로 떨어뜨린다", () => {
    expect(formatAdminValue(() => 1)).toBe("-");
  });
});

describe("formatAdminJson", () => {
  it("들여쓰기한 JSON을 만든다", () => {
    expect(formatAdminJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("직렬화할 수 없으면 문자열로 떨어뜨린다", () => {
    expect(formatAdminJson(undefined)).toBe("undefined");
  });
});

describe("collectAdminColumns", () => {
  it("행마다 다른 키까지 나온 순서대로 모은다", () => {
    expect(
      collectAdminColumns([
        { id: 1, name: "a" },
        { id: 2, currencyCode: "USD" },
      ]),
    ).toEqual(["id", "name", "currencyCode"]);
  });

  it("행이 없으면 컬럼도 없다", () => {
    expect(collectAdminColumns([])).toEqual([]);
  });
});
