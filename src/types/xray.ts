export type XRayTabId = "exposure" | "fitness";

export interface ExposureShareItem {
  readonly currencyCode: string;
  readonly krw: number;
  readonly sharePct: number;
}

export interface AttributionRowItem {
  readonly key: string;
  readonly label: string;
  readonly krw: number;
  readonly contributionPct: number;
}

export interface HoldingReturnItem {
  readonly ticker: string;
  readonly krw: number;
  readonly returnPct: number;
}

export interface PnLDecompositionData {
  readonly costBasisKrw: number;
  readonly totalValuationKrw: number;
  readonly totalReturnPct: number;
  readonly rows: readonly AttributionRowItem[];
  readonly holdings: readonly HoldingReturnItem[];
}

export interface StressScenarioItem {
  readonly code: string;
  readonly label: string;
  readonly equityShockPct: number;
  readonly fxShockPct: number;
  readonly referenceEvent: string;
  readonly assumptionNote: string;
}

export interface StressRunResult {
  readonly scenarioCode: string;
  readonly label: string;
  readonly shockLabel: string;
  readonly totalEffectKrw: number;
  readonly equityEffectKrw: number;
  readonly fxEffectKrw: number;
  readonly afterFxAssetKrw: number;
  readonly conditionalNote: string;
}

export interface ConcentrationDiagnosis {
  readonly topCurrencyCode?: string;
  readonly sharePct?: number;
  readonly status: string;
  readonly statusLabel: string;
  /** 위험성향이 측정된 계정에만 서버가 기준선을 준다. */
  readonly thresholdPct?: number;
  readonly gapPp?: number;
  readonly riskProfileStatus: string;
  readonly gradeLabel?: string;
  readonly diagnosedOnLabel?: string;
  readonly basisNote: string;
}

export interface XRayDashboardData {
  readonly totalAssetKrw: number;
  readonly fxKrw: number;
  readonly krwAmount: number;
  readonly fxRatioPct: number;
  readonly exposure: readonly ExposureShareItem[];
  readonly fxSensitivity1pctKrw: number;
  readonly pnl: PnLDecompositionData;
  readonly scenarios: readonly StressScenarioItem[];
  readonly concentration: ConcentrationDiagnosis;
  readonly asOfLabel: string;
}
