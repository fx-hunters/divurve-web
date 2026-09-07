import type { NotificationSettingKey } from '../api/generated/divurve-api';

/**
 * 마이페이지 표시 데이터.
 *
 * 값은 모두 백엔드 응답(`MyPageBundle`)에서 온다. 화면이 쓰는 형태로 바꾸는
 * 일은 `screens/mypage/mypage-presenter.ts`가 전담한다.
 */

export interface UserProfileView {
  readonly name: string;
  readonly email: string;
  /** 계정 종류 표시. BE의 `ProfileResponse.isDemo`에서 온다. */
  readonly accountLabel: string;
  readonly isDemoAccount: boolean;
}

export interface RiskProfileView {
  /** 진단을 마쳤는지. BE가 `status: "not_measured"`로 알려 준다. */
  readonly isMeasured: boolean;
  readonly gradeLabel: string;
  readonly scoreLabel: string | null;
  readonly diagnosedOnLabel: string | null;
  readonly limitationNote: string | null;
}

export interface NotificationSettingView {
  readonly key: NotificationSettingKey;
  readonly label: string;
  readonly isEnabled: boolean;
}

export interface SettingsView {
  /** 0~100(%). BE의 `fxDiscountRatio`(0~1)를 표시 단위로 옮긴 값. */
  readonly discountPercent: number;
  /** 서버가 계산한 실효 스프레드. 프론트에서 다시 구하지 않는다. */
  readonly effectiveSpreadLabel: string;
  readonly baseSpreadLabel: string;
  readonly explainLevel: string;
  readonly explainDomain: string;
  readonly notificationSettings: readonly NotificationSettingView[];
}

export interface NotificationView {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly receivedAtLabel: string;
  readonly isRead: boolean;
}

export interface MyPageViewData {
  readonly profile: UserProfileView;
  readonly riskProfile: RiskProfileView | null;
  readonly settings: SettingsView;
  readonly notifications: readonly NotificationView[];
}

export type { NotificationSettingKey };
