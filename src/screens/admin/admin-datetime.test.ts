import { describe, expect, it } from "vitest";
import {
  formatAdminDateTime,
  toAdminDateInputValue,
  toDefaultFxRateRange,
} from "./admin-datetime";

describe("formatAdminDateTime", () => {
  it("ISO 시각을 서울 기준 YY.MM.DD HH:mm으로 적는다", () => {
    // 2026-09-08T05:12:33Z = 서울 14:12
    expect(formatAdminDateTime("2026-09-08T05:12:33.412Z")).toBe(
      "26.09.08 14:12",
    );
    expect(formatAdminDateTime("2026-01-02T00:00:00Z")).toBe("26.01.02 09:00");
  });

  it("UTC 자정 언저리를 서울 날짜로 넘겨 읽는다", () => {
    // UTC 23:30은 서울로는 다음 날 08:30이다.
    expect(formatAdminDateTime("2026-09-07T23:30:00Z")).toBe("26.09.08 08:30");
    // 서울 자정은 24:00이 아니라 00:00으로 적는다.
    expect(formatAdminDateTime("2026-09-07T15:00:00Z")).toBe("26.09.08 00:00");
  });

  it("값이 없으면 -로 둔다", () => {
    expect(formatAdminDateTime(null)).toBe("-");
    expect(formatAdminDateTime(undefined)).toBe("-");
    expect(formatAdminDateTime("")).toBe("-");
  });

  it("읽지 못한 문자열은 서버가 준 그대로 남긴다", () => {
    expect(formatAdminDateTime("어제")).toBe("어제");
    expect(formatAdminDateTime("2026-13-45")).toBe("2026-13-45");
  });

  it("문자열이 아닌 값은 admin-value의 표기를 따른다", () => {
    expect(formatAdminDateTime(1234.5)).toBe("1,234.5");
    expect(formatAdminDateTime(true)).toBe("true");
  });
});

describe("toAdminDateInputValue", () => {
  it("서울 기준 YYYY-MM-DD로 끊는다", () => {
    expect(toAdminDateInputValue(new Date("2026-09-08T05:12:33Z"))).toBe(
      "2026-09-08",
    );
    // UTC로는 아직 7일이지만 서울은 이미 8일이다.
    expect(toAdminDateInputValue(new Date("2026-09-07T15:00:00Z"))).toBe(
      "2026-09-08",
    );
  });
});

describe("toDefaultFxRateRange", () => {
  it("to는 오늘, from은 한 달 전이다", () => {
    expect(toDefaultFxRateRange(new Date("2026-09-08T05:00:00Z"))).toEqual({
      from: "2026-08-08",
      to: "2026-09-08",
    });
  });

  it("1월이면 from은 전년 12월이 된다", () => {
    expect(toDefaultFxRateRange(new Date("2026-01-15T05:00:00Z"))).toEqual({
      from: "2025-12-15",
      to: "2026-01-15",
    });
  });

  it("한 달 전에 없는 날짜는 그 달 마지막 날로 당긴다", () => {
    // 3/31의 한 달 전은 2/31이 아니라 2/28이다.
    expect(toDefaultFxRateRange(new Date("2026-03-31T05:00:00Z"))).toEqual({
      from: "2026-02-28",
      to: "2026-03-31",
    });
    // 윤년이면 2/29까지 있다.
    expect(toDefaultFxRateRange(new Date("2028-03-31T05:00:00Z"))).toEqual({
      from: "2028-02-29",
      to: "2028-03-31",
    });
    // 5/31의 한 달 전은 4/30.
    expect(toDefaultFxRateRange(new Date("2026-05-31T05:00:00Z"))).toEqual({
      from: "2026-04-30",
      to: "2026-05-31",
    });
  });

  it("기준 시각을 서울 날짜로 읽는다", () => {
    // UTC로는 9/7이지만 서울은 9/8이다.
    expect(toDefaultFxRateRange(new Date("2026-09-07T15:00:00Z"))).toEqual({
      from: "2026-08-08",
      to: "2026-09-08",
    });
  });
});
