import { DEADLINE_TRAVEL_PLAN_FIXTURE } from "./deadline-travel-plan";
import { RECURRING_INVESTMENT_PLAN_FIXTURE } from "./recurring-investment-plan";

/**
 * 플래너 화면 전용 데모 응답 fixture.
 *
 * 화면에 표시되는 문구·금액·비율·일정·상태·Curve 좌표는 두 개의
 * 개별 fixture에서 전달한다. 값은 제품 규칙이 아닌 프로토타입 예시다.
 */
export const DEMO_ROUTE_PLAN_RESPONSE = {
  data: {
    data_notice: {
      source: "mock",
      source_label: "데모 데이터",
      as_of_label: "1차 프로토타입",
      notice: "화면의 금액·비율·일정·상태는 체험 응답 값이며 실제 실행 계획이 아닙니다.",
    },
    intro: {
      eyebrow: "DIVURVE",
      title: "어떤 외화 목표를 준비하고 있나요?",
      description: "목표 하나를 고르면 현재 위치부터 도착점까지 하나의 계획 Curve로 이어서 보여 드립니다.",
      new_plan_label: "새로운 계획 만들기",
      demo_action_label: "예시로 먼저 체험하기",
      creation_notice: "새 계획 입력과 저장은 다음 API 계약에서 연결할 예정입니다. 지금은 두 데모 목표를 체험할 수 있습니다.",
    },
    plans: [
      RECURRING_INVESTMENT_PLAN_FIXTURE,
      DEADLINE_TRAVEL_PLAN_FIXTURE,
    ],
  },
  meta: {
    timestamp: "2026-09-06T00:00:00+09:00",
  },
} as const;
