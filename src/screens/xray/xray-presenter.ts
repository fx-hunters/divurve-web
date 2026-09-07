import type {
  StressRunResponse,
  XrayBundle,
} from "../../api/generated/divurve-api";
import type {
  ConcentrationDiagnosis,
  ExposureShareItem,
  PnLDecompositionData,
  StressRunResult,
  StressScenarioItem,
  XRayDashboardData,
} from "../../types/xray";

/** 비율(0~1)을 소수 첫째 자리까지의 퍼센트 수치로 바꾼다. 표시 단위 변환이다. */
export function toPercent(ratio: number): number {
  return Math.round(ratio * 1000) / 10;
}

export const CONCENTRATION_STATUS_LABELS: Readonly<Record<string, string>> = {
  ok: "적정",
  watch: "관찰",
  over: "기준선 초과",
  unknown: "판정 불가",
};

export function toConcentrationStatusLabel(status: string): string {
  return CONCENTRATION_STATUS_LABELS[status] ?? status;
}

export function toDateLabel(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    parsed,
  );
}

export function toAsOfLabel(asOf: string): string {
  const parsed = new Date(asOf);
  if (Number.isNaN(parsed.getTime())) return asOf;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function toShockLabel(equityShock: number, fxShock: number): string {
  const equity = toPercent(equityShock);
  const fx = toPercent(fxShock);
  return `주가 ${equity > 0 ? "+" : ""}${equity}%, 환율 ${fx > 0 ? "+" : ""}${fx}% 충격 가정`;
}

function toExposure(bundle: XrayBundle): readonly ExposureShareItem[] {
  return bundle.overview.exposure.map((item) => ({
    currencyCode: item.currencyCode,
    krw: item.krw,
    sharePct: toPercent(item.share),
  }));
}

function toPnl(bundle: XrayBundle): PnLDecompositionData {
  const { attribution } = bundle;
  return {
    costBasisKrw: attribution.costBasisKrw,
    totalValuationKrw: attribution.currentKrw,
    totalReturnPct: toPercent(attribution.totalReturn),
    rows: attribution.components.map((component) => ({
      key: component.key,
      label: component.label,
      krw: component.krw,
      contributionPct: component.contributionPp,
    })),
    holdings: attribution.byHolding.map((holding) => ({
      ticker: holding.ticker,
      krw: holding.krw,
      returnPct: toPercent(holding.krwReturn),
    })),
  };
}

function toScenarios(bundle: XrayBundle): readonly StressScenarioItem[] {
  return [...bundle.scenarios.scenarios]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((scenario) => ({
      code: scenario.scenarioCode,
      label: scenario.nameKo,
      equityShockPct: toPercent(scenario.equityShockPct),
      fxShockPct: toPercent(scenario.fxShockPct),
      referenceEvent: scenario.referenceEvent,
      assumptionNote: scenario.assumptionNote,
    }));
}

function toConcentration(bundle: XrayBundle): ConcentrationDiagnosis {
  const { concentration, riskProfile, relation, basisNote } = bundle.fit;
  return {
    topCurrencyCode: concentration.topCurrencyCode,
    sharePct:
      concentration.share === undefined
        ? undefined
        : toPercent(concentration.share),
    status: concentration.status,
    statusLabel: toConcentrationStatusLabel(concentration.status),
    thresholdPct:
      relation.facts.threshold === undefined
        ? undefined
        : toPercent(relation.facts.threshold),
    gapPp: relation.facts.gapPp,
    riskProfileStatus: riskProfile.status,
    gradeLabel: riskProfile.gradeLabel,
    diagnosedOnLabel: toDateLabel(riskProfile.diagnosedOn),
    basisNote,
  };
}

export function toXRayDashboardData(bundle: XrayBundle): XRayDashboardData {
  const { overview } = bundle;
  return {
    totalAssetKrw: overview.totalAssetKrw,
    fxKrw: overview.fxAssetKrw,
    krwAmount: overview.krwAssetKrw,
    fxRatioPct: toPercent(overview.fxRatio),
    exposure: toExposure(bundle),
    fxSensitivity1pctKrw: overview.sensitivity1pct.totalKrw,
    pnl: toPnl(bundle),
    scenarios: toScenarios(bundle),
    concentration: toConcentration(bundle),
    asOfLabel: toAsOfLabel(bundle.asOf),
  };
}

export function toStressRunResult(run: StressRunResponse): StressRunResult {
  return {
    scenarioCode: run.scenario.scenarioCode,
    label: run.scenario.nameKo,
    shockLabel: toShockLabel(run.shock.equityShockPct, run.shock.fxShockPct),
    totalEffectKrw: run.effects.totalEffectKrw,
    equityEffectKrw: run.effects.equityEffectKrw,
    fxEffectKrw: run.effects.fxEffectKrw,
    afterFxAssetKrw: run.after.fxAssetKrw,
    conditionalNote: run.conditionalNote,
  };
}
