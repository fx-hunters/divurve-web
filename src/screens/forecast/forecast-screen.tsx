import { useForecast, type ForecastLoader } from "./use-forecast";
import { FanChart } from "./fan-chart";
import { ForecastControls } from "./cards/forecast-controls";
import { DriversCard } from "./cards/drivers-card";
import { EventsCard } from "./cards/events-card";
import { ModelScoreCard } from "./cards/model-score-card";
import { SummaryColumn } from "./cards/summary-column";
import { CARD_SURFACE, CARD_TITLE } from "./cards/card-surface";
import { AiExplanation } from "../../components/ai/ai-explanation";
import { ApiStateView } from "../../components/common/api-state-view";
import { Badge } from "../../components/common/badge";
import { Spinner } from "../../components/common/spinner";
import {
  useAiExplanation,
  type AiExplanationState,
  type ExplanationRequester,
} from "../../hooks/use-ai-explanation";
import type { NavTabId } from "../../types/navigation";
import {
  type FanChartDataPoint,
  type ForecastPair,
  type ForecastPeriod,
  type PairForecastInfo,
} from "../../types/forecast";
import {
  currencyColor,
  toExplanationFacts,
  toPairForecastInfo,
  toPairLabel,
  toFanChartData,
  toPeriodLabel,
  toRegimeBadge,
} from "./forecast-presenter";

interface ForecastScreenProps {
  readonly onNavigate?: (tab: NavTabId) => void;
  readonly loader?: ForecastLoader;
  /** 테스트에서 AI 설명 호출을 대체하기 위한 주입점. 기본은 실제 API다. */
  readonly explanationRequester?: ExplanationRequester;
}

/** AI 자연어 설명이 붙는 지면. 백엔드가 문장 톤을 이 값으로 가른다. */
const EXPLANATION_SURFACE = "forecast_summary";

export function ForecastScreen({
  onNavigate,
  loader,
  explanationRequester,
}: ForecastScreenProps) {
  const { pair, period, state, setPair, setPeriod, reload } =
    useForecast(loader);

  // 근거 수치가 없으면(로딩·에러·빈 상태) 훅이 요청하지 않고 idle로 둔다.
  const facts =
    state.status === "success" ? toExplanationFacts(state.data) : null;
  const explanation = useAiExplanation({
    surface: EXPLANATION_SURFACE,
    facts,
    requester: explanationRequester,
  });

  if (state.status === "loading") {
    return (
      <ApiStateView
        status="loading"
        title="환율 범위를 불러오는 중입니다"
        message="팬 차트와 근거 데이터를 함께 확인하고 있습니다."
      />
    );
  }
  if (state.status === "error") {
    return (
      <ApiStateView
        status="error"
        title="환율 범위를 불러오지 못했습니다"
        message={state.message}
        onRetry={reload}
      />
    );
  }
  if (state.status === "empty") {
    return (
      <ApiStateView
        status="empty"
        title="표시할 환율 범위가 없습니다"
        message="선택한 통화쌍과 전망 기간의 데이터가 준비되면 이곳에 표시됩니다."
      />
    );
  }

  return (
    <ForecastView
      pair={pair}
      period={period}
      chartData={toFanChartData(state.data)}
      pairInfo={toPairForecastInfo(state.data, pair)}
      explanationState={explanation.state}
      onReloadExplanation={explanation.reload}
      onSelectPair={setPair}
      onSelectPeriod={setPeriod}
      onNavigate={onNavigate}
    />
  );
}

interface ForecastViewProps {
  readonly pair: ForecastPair;
  readonly period: ForecastPeriod;
  readonly chartData: readonly FanChartDataPoint[];
  readonly pairInfo: PairForecastInfo;
  readonly explanationState: AiExplanationState;
  readonly onReloadExplanation: () => void;
  readonly onSelectPair: (pair: ForecastPair) => void;
  readonly onSelectPeriod: (period: ForecastPeriod) => void;
  readonly onNavigate?: (tab: NavTabId) => void;
}

function ForecastView({
  pair,
  period,
  chartData,
  pairInfo,
  explanationState,
  onReloadExplanation,
  onSelectPair,
  onSelectPeriod,
  onNavigate,
}: ForecastViewProps) {
  const pairLabel = toPairLabel(pair);
  const accentColor = currencyColor(pair.baseCode);
  const periodLabel = toPeriodLabel(period);
  const regimeBadge =
    explanationState.status === "success"
      ? toRegimeBadge(explanationState.meta.regime)
      : null;

  const handleNavigateToPlanner = () => {
    if (onNavigate) {
      onNavigate("planner");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <ForecastControls
        pair={pair}
        period={period}
        asOfLabel={pairInfo.asOfLabel}
        onSelectPair={onSelectPair}
        onSelectPeriod={onSelectPeriod}
      />

      {/* 팬 차트 및 우측 요약 카드 그리드 */}
      <div className="forecast-main-grid">
        <div
          className="forecast-chart-card"
          style={{
            ...CARD_SURFACE,
            padding: "1.5rem",
            minHeight: "380px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2 style={{ ...CARD_TITLE, marginBottom: "1rem" }}>
            시뮬레이션 팬 차트 ({pairLabel})
          </h2>
          <div style={{ flex: 1, minHeight: "280px" }}>
            <FanChart
              data={chartData}
              pairLabel={pairLabel}
              accentColor={accentColor}
            />
          </div>
        </div>

        <SummaryColumn
          period={period}
          pairInfo={pairInfo}
          onNavigateToPlanner={handleNavigateToPlanner}
        />
      </div>

      {/* 팬 차트 하단 AI 자연어 설명 + 서버가 준 국면 배지 */}
      {explanationState.status !== "idle" && (
        <div
          style={{
            ...CARD_SURFACE,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            padding: "1.25rem 1.5rem",
          }}
        >
          {regimeBadge !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                시장 국면
              </span>
              <Badge variant={regimeBadge.tone}>{regimeBadge.label}</Badge>
            </div>
          )}
          <AiExplanation
            state={explanationState}
            onRetry={onReloadExplanation}
            title={`${pairLabel} ${periodLabel} 범위 설명`}
            loadingIndicator={<Spinner size={20} />}
          />
        </div>
      )}

      {/* 하단 3단 그리드 — 카드 높이는 서로 끌려가지 않는다(layout.css). */}
      <div className="forecast-bottom-grid">
        <DriversCard drivers={pairInfo.drivers} />
        <EventsCard events={pairInfo.events} />
        <ModelScoreCard score={pairInfo.modelScore} />
      </div>
    </div>
  );
}
