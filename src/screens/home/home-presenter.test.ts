import { describe, expect, it } from "vitest";
import {
  EMPTY_HOME_SUMMARY_FIXTURE,
  HOME_SUMMARY_FIXTURE,
  SPARSE_HOME_SUMMARY_FIXTURE,
} from "../../test/api-fixtures";
import {
  toBadgeLabel,
  toBadgeTone,
  toBlockStates,
  toDateLabel,
  toHomeDashboardData,
  toRateLabel,
} from "./home-presenter";

describe("표시용 변환", () => {
  it("판정 배지를 한국어 라벨로 바꾸고, 모르는 값·없는 값을 안전하게 다룬다", () => {
    expect(toBadgeLabel("normal")).toBe("정상");
    expect(toBadgeLabel("caution")).toBe("주의");
    expect(toBadgeLabel("brand_new")).toBe("brand_new");
    expect(toBadgeLabel(undefined)).toBe("판정 불가");
  });

  it("판정 배지의 톤을 매핑한다", () => {
    expect(toBadgeTone("calm")).toBe("normal");
    expect(toBadgeTone("caution")).toBe("warn");
    expect(toBadgeTone("extreme")).toBe("danger");
    expect(toBadgeTone("brand_new")).toBe("default");
    expect(toBadgeTone(undefined)).toBe("default");
  });

  it("날짜는 로케일 형식으로, 해석 불가하면 원문 그대로 둔다", () => {
    expect(toDateLabel("2026-09-09")).toMatch(/2026/);
    expect(toDateLabel("모름")).toBe("모름");
  });

  it("환율은 소수 두 자리로 표시한다", () => {
    expect(toRateLabel(1_382.4)).toBe("1,382.40");
  });

  it("서버가 보내지 않은 블록은 빈 상태로 채운다", () => {
    expect(toBlockStates([{ key: "today", state: "filled" }])).toEqual({
      today: "filled",
      profile_fit: "empty",
      fx_status: "empty",
      goals_route: "empty",
      attention: "empty",
      forecast: "empty",
    });
  });
});

describe("toHomeDashboardData", () => {
  it("모든 블록이 채워진 응답을 화면 뷰 데이터로 옮긴다", () => {
    const data = toHomeDashboardData(HOME_SUMMARY_FIXTURE);

    expect(data.blockStates.today).toBe("filled");
    expect(data.today).toEqual({
      headline: "USD 변동성이 평시보다 높습니다.",
      badgeLabel: "주의",
      tone: "warn",
    });
    expect(data.profileFit).toEqual({
      gradeLabel: "중립형",
      concentrationLabel: "기준선 초과",
      tone: "danger",
    });
    expect(data.fxStatus).toEqual({
      fxRatioPct: 36.1,
      topCurrencyCode: "USD",
      dayChangeKrw: 84_000,
      sensitivity1pctKrw: 247_200,
    });
    expect(data.goalsRoute.isRouteEnabled).toBe(true);
    expect(data.goalsRoute.goals).toEqual([
      {
        id: "goal-1",
        name: "도쿄 여행",
        currencyCode: "JPY",
        targetAmount: 300_000,
        targetDateLabel: expect.stringMatching(/2026/),
        status: "active",
      },
    ]);
    expect(data.attention.regimeLabel).toBe("주의");
    expect(data.attention.events).toEqual([
      {
        title: "Federal Funds Rate Decision",
        dateLabel: expect.stringMatching(/2026/),
        currencyCode: "USD",
        severity: "고변동성",
      },
      {
        title: "Retail Sales",
        dateLabel: expect.stringMatching(/2026/),
        currencyCode: "USD",
        severity: "중변동성",
      },
    ]);
    expect(data.forecast).toEqual({
      pairLabel: "USDKRW",
      currentRateLabel: "1,382.40",
      lowerLabel: "1,330.60",
      upperLabel: "1,389.02",
    });
    expect(data.asOfLabel).toMatch(/2026/);
  });

  it("위험성향 미측정·목표 없음 응답도 안전하게 변환한다", () => {
    const data = toHomeDashboardData(SPARSE_HOME_SUMMARY_FIXTURE);

    expect(data.blockStates.profile_fit).toBe("not_measured");
    expect(data.blockStates.goals_route).toBe("route_pending");
    expect(data.today.headline).toBe("USD 변동성이 평시 범위입니다.");
    expect(data.profileFit).toEqual({
      gradeLabel: undefined,
      concentrationLabel: "판정 불가",
      tone: "default",
    });
    expect(data.fxStatus.dayChangeKrw).toBeUndefined();
    expect(data.goalsRoute).toEqual({ goals: [], isRouteEnabled: false });
    expect(data.attention.events).toEqual([]);
  });

  it("값이 통째로 빠진 응답은 빈 값과 중립 문구로 물러난다", () => {
    const data = toHomeDashboardData(EMPTY_HOME_SUMMARY_FIXTURE);

    expect(data.today).toEqual({
      headline: "오늘의 요약을 준비하고 있습니다.",
      badgeLabel: "판정 불가",
      tone: "default",
    });
    expect(data.fxStatus).toEqual({
      fxRatioPct: undefined,
      topCurrencyCode: undefined,
      dayChangeKrw: undefined,
      sensitivity1pctKrw: undefined,
    });
    expect(data.forecast).toEqual({
      pairLabel: "-",
      currentRateLabel: undefined,
      lowerLabel: undefined,
      upperLabel: undefined,
    });
  });

  it("모르는 headline 코드는 배지 기준 문구로, 배지도 모르면 기본 문구로 물러난다", () => {
    const byBadge = toHomeDashboardData({
      ...HOME_SUMMARY_FIXTURE,
      data: {
        ...HOME_SUMMARY_FIXTURE.data,
        today: { headlineCode: "brand_new_code", badge: "normal" },
      },
    });
    expect(byBadge.today.headline).toBe("특별히 주의할 변화는 없습니다.");

    const fallback = toHomeDashboardData({
      ...HOME_SUMMARY_FIXTURE,
      data: {
        ...HOME_SUMMARY_FIXTURE.data,
        today: { headlineCode: "brand_new_code", badge: "brand_new" },
      },
    });
    expect(fallback.today.headline).toBe("오늘의 요약을 준비하고 있습니다.");
  });

  it("모르는 집중도 상태와 위험성향 등급은 코드를 그대로 보여준다", () => {
    const data = toHomeDashboardData({
      ...HOME_SUMMARY_FIXTURE,
      data: {
        ...HOME_SUMMARY_FIXTURE.data,
        profileFit: { grade: "brand_new", concentrationStatus: "brand_new" },
      },
    });
    expect(data.profileFit).toEqual({
      gradeLabel: "brand_new",
      concentrationLabel: "brand_new",
      tone: "default",
    });
  });

  it("기준 시각이 해석 불가하면 원문을 그대로 둔다", () => {
    const data = toHomeDashboardData({
      ...HOME_SUMMARY_FIXTURE,
      meta: { asOf: "모름" },
    });
    expect(data.asOfLabel).toBe("모름");
  });
});
