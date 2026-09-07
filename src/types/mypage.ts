export type RiskProfileType =
  | "안정항로형"
  | "균형항로형"
  | "적극항로형"
  | "도전항로형";

export interface UserProfile {
  readonly name: string;
  readonly email: string;
  readonly riskProfile: RiskProfileType;
  readonly diagnosisDate: string;
}

export type NotificationKey =
  | "budgetWarning"
  | "highVolatility"
  | "opportunityBucket"
  | "safetyMode";

export interface NotificationOption {
  readonly id: NotificationKey;
  readonly label: string;
}

export interface MyPageSettings {
  readonly bankPreferentialRate: number;
  readonly notifications: Record<NotificationKey, boolean>;
}
