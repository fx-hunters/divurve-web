import type {
  MyPageBundle,
  NotificationSettingKey,
  SettingsResponse,
} from "../../api/generated/divurve-api";
import type {
  MyPageViewData,
  NotificationSettingView,
  NotificationView,
  RiskProfileView,
  SettingsView,
  UserProfileView,
} from "../../types/mypage";

/** 알림 설정 표기. 값과 순서는 백엔드 `SettingsResponse` 필드를 따른다. */
export const NOTIFICATION_SETTING_LABELS: readonly {
  readonly key: NotificationSettingKey;
  readonly label: string;
}[] = [
  { key: "notifyStepDue", label: "회차 실행일 안내" },
  { key: "notifyRegimeShift", label: "변동성 구간 변화 안내" },
  { key: "notifyDeadlineNear", label: "마감 임박 안내" },
  { key: "notifyTargetZone", label: "목표 구간 도달 안내" },
  { key: "notifyConcentration", label: "집중도 경고 안내" },
] as const;

/** 비율(0~1)을 표시용 퍼센트 문자열로 옮긴다. 값을 새로 만들지 않는다. */
export function toPercentLabel(ratio: number, fractionDigits = 2): string {
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}

export function toDateLabel(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }
  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function toProfileView(bundle: MyPageBundle): UserProfileView {
  const { profile } = bundle;
  return {
    name: profile.name,
    email: profile.email,
    accountLabel: profile.isDemo ? "데모 계정" : "내 계정",
    isDemoAccount: profile.isDemo,
  };
}

function toRiskProfileView(bundle: MyPageBundle): RiskProfileView | null {
  const { riskProfile } = bundle;
  if (!riskProfile) {
    return null;
  }

  const gradeLabel = riskProfile.gradeLabel ?? riskProfile.grade ?? "";
  return {
    isMeasured: gradeLabel !== "",
    gradeLabel,
    scoreLabel:
      riskProfile.score === undefined ? null : `서버 점수 ${riskProfile.score}`,
    diagnosedOnLabel:
      riskProfile.diagnosedOn === undefined
        ? null
        : `진단일 ${toDateLabel(riskProfile.diagnosedOn)}`,
    limitationNote: riskProfile.limitationNote ?? null,
  };
}

function toNotificationSettingViews(
  settings: SettingsResponse,
): readonly NotificationSettingView[] {
  return NOTIFICATION_SETTING_LABELS.map(({ key, label }) => ({
    key,
    label,
    isEnabled: settings[key],
  }));
}

export function toSettingsView(settings: SettingsResponse): SettingsView {
  return {
    discountPercent: Math.round(settings.fxDiscountRatio * 100),
    effectiveSpreadLabel: toPercentLabel(settings.effectiveSpreadRatio),
    baseSpreadLabel: toPercentLabel(settings.baseSpreadRatio),
    explainLevel: settings.explainLevel,
    explainDomain: settings.explainDomain,
    notificationSettings: toNotificationSettingViews(settings),
  };
}

function toNotificationViews(bundle: MyPageBundle): readonly NotificationView[] {
  return bundle.notifications.notifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    message: notification.message,
    receivedAtLabel: toDateLabel(notification.createdAt),
    isRead: notification.read,
  }));
}

export function toMyPageViewData(bundle: MyPageBundle): MyPageViewData {
  return {
    profile: toProfileView(bundle),
    riskProfile: toRiskProfileView(bundle),
    settings: toSettingsView(bundle.settings),
    notifications: toNotificationViews(bundle),
  };
}
