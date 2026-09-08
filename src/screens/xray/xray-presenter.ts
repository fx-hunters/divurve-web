import type {
  StressRunResponse,
  XrayBundle,
} from "../../api/generated/divurve-api";
import type { ExplanationFacts } from "../../hooks/use-ai-explanation";
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

/**
 * AI 설명(`POST /api/v1/ai/explain`)에 실을 근거 수치를 만든다.
 *
 * 엔진이 준 값을 골라 담기만 하고 새로 계산하지 않는다(AGENTS.md §1).
 * 값이 없는 키는 아예 빼서 보낸다.
 *
 * 키 표기는 요청 본문 그대로 서버에 닿으므로(`isRawBody`) 백엔드 계약의
 * snake_case 를 쓴다. 홈·환율 전망 화면의 facts 와 같은 규칙이다.
 *
 * ⚠️ 비율은 반드시 0~1 스케일로 넣는다. 백엔드 수치 대조기는 서술 속
 * `%` 토큰을 100으로 나눠 facts와 비교하므로("63%" → 0.63), 화면 표시용
 * 0~100 값을 그대로 실으면 63 ≠ 0.63 으로 어긋나 `fallback: true`가 된다.
 * `toRatio`가 표시용 퍼센트를 API 원본과 같은 비율 단위로 되돌린다.
 */
/** 표시용 퍼센트(0~100)를 API 원본과 같은 비율(0~1)로 되돌린다. */
function toRatio(percent: number | undefined): number | undefined {
  return percent === undefined ? undefined : percent / 100;
}

function compactFacts(
  source: Readonly<Record<string, unknown>>,
): ExplanationFacts {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== undefined),
  );
}

/** 통화 노출 탭의 근거 수치. 노출 목록이 비면 요청하지 않도록 null을 준다. */
export function toExposureExplanationFacts(
  data: XRayDashboardData,
): ExplanationFacts | null {
  if (data.exposure.length === 0) return null;
  return compactFacts({
    total_asset_krw: data.totalAssetKrw,
    fx_asset_krw: data.fxKrw,
    krw_asset_krw: data.krwAmount,
    fx_ratio: toRatio(data.fxRatioPct),
    exposure: data.exposure.map((item) => ({
      currency_code: item.currencyCode,
      krw: item.krw,
      share: toRatio(item.sharePct),
    })),
    fx_sensitivity_1pct_krw: data.fxSensitivity1pctKrw,
    total_return: toRatio(data.pnl.totalReturnPct),
    concentration_status: data.concentration.status,
    concentration_threshold: toRatio(data.concentration.thresholdPct),
  });
}

/** 통화 적합도 탭의 근거 수치. 집중도가 없으면 요청하지 않도록 null을 준다. */
export function toFitnessExplanationFacts(
  data: XRayDashboardData,
): ExplanationFacts | null {
  const { concentration } = data;
  if (concentration.sharePct === undefined) return null;
  return compactFacts({
    top_currency_code: concentration.topCurrencyCode,
    concentration_share: toRatio(concentration.sharePct),
    concentration_status: concentration.status,
    concentration_threshold: toRatio(concentration.thresholdPct),
    gap: toRatio(concentration.gapPp),
    risk_profile_status: concentration.riskProfileStatus,
    risk_grade_label: concentration.gradeLabel,
  });
}
