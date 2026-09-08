import { useForecast, type ForecastLoader } from "./use-forecast";
import { FanChart } from "./fan-chart";
import { AiExplanation } from "../../components/ai/ai-explanation";
import { ApiStateView } from "../../components/common/api-state-view";
import { Badge } from "../../components/common/badge";
import { Icon } from "../../components/common/icon";
import { Spinner } from "../../components/common/spinner";
import {
  useAiExplanation,
  type AiExplanationState,
  type ExplanationRequester,
} from "../../hooks/use-ai-explanation";
import type { NavTabId } from "../../types/navigation";
import {
  FORECAST_HORIZON_DAYS,
  FORECAST_PAIRS,
  type FanChartDataPoint,
  type ForecastPair,
  type ForecastPeriod,
  type PairForecastInfo,
} from "../../types/forecast";
import {
  currencyColor,
  toExplanationFacts,
  toPair,
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

const PAIR_SELECT_ID = "forecast-pair-select";

/** 기간 컨트롤 문구. "무엇에 대한 기간"인지 컨트롤 자체가 말하게 한다. */
const PERIOD_GROUP_LABEL = "전망 기간";
const PERIOD_HELP_TEXT =
  "선택한 기간만큼 앞으로의 환율 범위를 팬 차트와 요약 카드에 표시합니다.";
const PERIOD_HELP_ID = "forecast-period-help";

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

  const { isPercentileWarn } = pairInfo.summary;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 상단 컨트롤 바 (통화 선택, 기간 토글, 다음 갱신 안내) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "0.75rem 1rem",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* 통화쌍 드롭다운 */}
        <label
          htmlFor={PAIR_SELECT_ID}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8125rem",
            fontWeight: 700,
            color: "var(--text-muted)",
          }}
        >
          <span>통화쌍</span>
          <span
            aria-hidden="true"
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "var(--radius-full)",
              backgroundColor: accentColor,
              display: "inline-block",
            }}
          />
          <select
            id={PAIR_SELECT_ID}
            value={pair.code}
            onChange={(event) => onSelectPair(toPair(event.target.value))}
            style={{
              padding: "0.5rem 0.75rem",
              fontWeight: 700,
              fontSize: "0.875rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
          >
            {FORECAST_PAIRS.map((option) => (
              <option key={option.code} value={option.code}>
                {toPairLabel(option)}
              </option>
            ))}
          </select>
        </label>

        {/* 전망 기간 토글 — 무엇에 대한 기간인지 라벨과 보조 설명으로 밝힌다 */}
        <div
          role="group"
          aria-label={PERIOD_GROUP_LABEL}
          aria-describedby={PERIOD_HELP_ID}
          style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}
            >
              {PERIOD_GROUP_LABEL}
            </span>
            {FORECAST_HORIZON_DAYS.map((option) => {
              const isSelected = period === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectPeriod(option)}
                  style={{
                    padding: "0.5rem 1rem",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: isSelected ? "var(--border)" : "transparent",
                    color: isSelected ? "var(--text)" : "var(--text-muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {toPeriodLabel(option)}
                </button>
              );
            })}
          </div>
          <p
            id={PERIOD_HELP_ID}
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            {PERIOD_HELP_TEXT}
          </p>
        </div>

        {/* 다음 갱신 안내 */}
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          기준 시각: {pairInfo.asOfLabel}
        </div>
      </div>

      {/* 팬 차트 및 우측 요약 카드 그리드 */}
      <div className="forecast-main-grid">
        {/* 좌측: 시뮬레이션 팬 차트 */}
        <div
          className="forecast-chart-card"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            boxShadow: "var(--shadow-sm)",
            minHeight: "380px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h2
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "1rem",
            }}
          >
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

        {/* 우측: 요약 지표 카드 3종 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* 80% 범위 카드 */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "1.25rem 1.5rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              80% 범위 ({periodLabel})
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--text)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              {pairInfo.summary.lowerLabel} ~ {pairInfo.summary.upperLabel}
            </div>
          </div>

          {/* 변동성 백분위 카드 */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "1.25rem 1.5rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              변동성 백분위
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: isPercentileWarn ? "var(--warn)" : "var(--primary)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              {pairInfo.summary.percentile}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: "0.375rem",
                fontWeight: 500,
              }}
            >
              {pairInfo.uncertaintyNote}
            </div>
          </div>

          {/* 내 자산에 미치는 영향 네온 카드 */}
          <div
            style={{
              backgroundColor: "var(--surface)",
              background: "linear-gradient(135deg, var(--surface) 0%, var(--primary-subtle) 100%)",
              border: "1px solid var(--primary-border)",
              borderRadius: "var(--radius-lg)",
              padding: "1.25rem 1.5rem",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              height: "100%",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--primary)",
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                내 자산에 미치는 영향
              </div>
              <div
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "var(--text)",
                  fontVariantNumeric: "tabular-nums",
                  marginBottom: "0.75rem",
                }}
              >
                1% 움직일 때 ₩{pairInfo.summary.impact}
              </div>
            </div>

            <button
              type="button"
              onClick={handleNavigateToPlanner}
              style={{
                fontSize: "0.875rem",
                color: "var(--primary)",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                marginTop: "0.5rem",
              }}
            >
              <span>내 계획에 적용하기</span>
              <Icon name="arrowRight" size={15} />
            </button>
          </div>
        </div>
      </div>


      {/* 팬 차트 하단 AI 자연어 설명 + 서버가 준 국면 배지 */}
      {explanationState.status !== "idle" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem 1.5rem",
            boxShadow: "var(--shadow-sm)",
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

      {/* 하단 3단 그리드: 전망 동인, 다가오는 일정, 모델 성적 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* 전망 동인 카드 */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h3
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "1.25rem",
            }}
          >
            전망 동인
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {pairInfo.drivers.length === 0 && (
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                이 통화쌍의 동인 데이터가 아직 제공되지 않습니다.
              </p>
            )}
            {pairInfo.drivers.map((driver) => {
              const barColor =
                driver.type === "danger"
                  ? "var(--danger)"
                  : driver.type === "normal"
                    ? "var(--normal)"
                    : "var(--text-muted)";
              return (
                <div
                  key={driver.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: "var(--text)" }}>{driver.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: `min(${driver.barWidthPx}px, 100px)`,
                        height: "8px",
                        backgroundColor: barColor,
                        borderRadius: "var(--radius-full)",
                        boxShadow: `0 0 4px ${barColor}`,
                        transition: "width 0.5s var(--ease-out-smooth), background-color 0.3s ease",
                        transformOrigin: "left",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 다가오는 일정 카드 */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h3
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "1.25rem",
            }}
          >
            다가오는 일정
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pairInfo.events.length === 0 && (
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                예정된 일정이 없습니다.
              </p>
            )}
            {pairInfo.events.map((event) => (
              <div
                key={event.title}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--bg)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>
                    {event.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "0.125rem",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {event.dateLabel}
                  </div>
                </div>
                <Badge variant={event.severity === "고변동성" ? "danger" : "warn"}>
                  {event.severity}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* 모델 성적 아코디언 카드 */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <details style={{ width: "100%" }}>
            <summary
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                outline: "none",
              }}
            >
              <span>모델 성적 (접힘)</span>
              <Icon name="chevronDown" size={15} />
            </summary>

            <div
              style={{
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                fontSize: "0.875rem",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 500 }}>
                <span style={{ color: "var(--text-muted)" }}>적중률</span>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  {pairInfo.modelScore.hitRatePct}%
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 500 }}>
                <span style={{ color: "var(--text-muted)" }}>평균 오차율</span>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  {pairInfo.modelScore.maePct}%
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 500 }}>
                <span style={{ color: "var(--text-muted)" }}>포함률(80%)</span>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  {pairInfo.modelScore.inclusion80Pct}%
                </span>
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--normal)",
                  fontWeight: 700,
                  marginTop: "0.5rem",
                  borderTop: "1px solid var(--border-subtle)",
                  paddingTop: "0.5rem",
                }}
              >
                랜덤워크 대비 +{pairInfo.modelScore.randomWalkImprovementPct}% 우수
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
