import { describe, expect, it } from "vitest";
import type { MyPageBundle } from "../../api/generated/divurve-api";
import { MY_PAGE_API_FIXTURE } from "../../test/api-fixtures";
import {
  toMyPageViewData,
  toPercentLabel,
  toDateLabel,
  toSettingsView,
} from "./mypage-presenter";

describe("toPercentLabel", () => {
  it("비율을 퍼센트 문자열로 옮긴다", () => {
    expect(toPercentLabel(0.002)).toBe("0.20%");
    expect(toPercentLabel(0.8, 0)).toBe("80%");
  });
});

describe("toDateLabel", () => {
  it("ISO 시각을 한국어 날짜로 옮긴다", () => {
    expect(toDateLabel("2026-09-07T00:00:00Z")).toMatch(/2026/);
  });

  it("해석할 수 없는 값은 그대로 둔다", () => {
    expect(toDateLabel("not-a-date")).toBe("not-a-date");
  });
});

describe("toSettingsView", () => {
  it("서버 비율을 표시 단위로 옮기고 스프레드는 서버 값을 그대로 쓴다", () => {
    const view = toSettingsView(MY_PAGE_API_FIXTURE.settings);

    expect(view).toMatchObject({
      discountPercent: 80,
      effectiveSpreadLabel: "0.20%",
      baseSpreadLabel: "1.00%",
      explainLevel: "simple",
      explainDomain: "plain",
    });
    expect(view.notificationSettings).toHaveLength(5);
    expect(view.notificationSettings[0]).toEqual({
      key: "notifyStepDue",
      label: "회차 실행일 안내",
      isEnabled: true,
    });
    expect(view.notificationSettings[3]).toMatchObject({
      key: "notifyTargetZone",
      isEnabled: false,
    });
  });
});

describe("toMyPageViewData", () => {
  it("전 필드가 있는 응답을 화면 데이터로 옮긴다", () => {
    const data = toMyPageViewData(MY_PAGE_API_FIXTURE);

    expect(data.profile).toEqual({
      name: "플래너 사용자",
      email: "planner@example.com",
      accountLabel: "내 계정",
      isDemoAccount: false,
    });
    expect(data.riskProfile).toMatchObject({
      isMeasured: true,
      gradeLabel: "균형 항로형",
      scoreLabel: "서버 점수 72",
    });
    expect(data.riskProfile?.diagnosedOnLabel).toMatch(/진단일 2026/);
    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0]).toMatchObject({
      id: "notice-1",
      title: "회차 확인",
      isRead: false,
    });
  });

  it("성향 진단이 없고 알림이 비어도 화면 데이터를 만든다", () => {
    const bundle: MyPageBundle = {
      ...MY_PAGE_API_FIXTURE,
      profile: { ...MY_PAGE_API_FIXTURE.profile, isDemo: true },
      riskProfile: null,
      notifications: { notifications: [] },
    };

    const data = toMyPageViewData(bundle);

    expect(data.profile.accountLabel).toBe("데모 계정");
    expect(data.profile.isDemoAccount).toBe(true);
    expect(data.riskProfile).toBeNull();
    expect(data.notifications).toEqual([]);
  });

  it("진단 전(status: not_measured) 응답을 미측정 상태로 옮긴다", () => {
    const bundle: MyPageBundle = {
      ...MY_PAGE_API_FIXTURE,
      riskProfile: {
        status: "not_measured",
        simple: { answers: {}, rationale: [] },
        detail: { completed: false, answered: {}, nextQuestion: "q4" },
      },
    };

    expect(toMyPageViewData(bundle).riskProfile).toEqual({
      isMeasured: false,
      gradeLabel: "",
      scoreLabel: null,
      diagnosedOnLabel: null,
      limitationNote: null,
    });
  });

  it("gradeLabel이 없으면 grade 값을 그대로 쓴다", () => {
    const bundle: MyPageBundle = {
      ...MY_PAGE_API_FIXTURE,
      riskProfile: { status: "measured", grade: "balanced", score: 50 },
    };

    expect(toMyPageViewData(bundle).riskProfile).toMatchObject({
      isMeasured: true,
      gradeLabel: "balanced",
      scoreLabel: "서버 점수 50",
    });
  });
});
