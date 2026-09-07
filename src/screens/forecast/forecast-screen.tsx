import { useForecast, type ForecastLoader } from "./use-forecast";
import { FanChart } from "./fan-chart";
import { ApiStateView } from "../../components/common/api-state-view";
import { Badge } from "../../components/common/badge";
import { Icon } from "../../components/common/icon";
import type { NavTabId } from "../../types/navigation";
import type {
  CurrencyForecastInfo,
  FanChartDataPoint,
  ForecastCurrency,
  ForecastPeriod,
} from "../../types/forecast";
import {
  toCurrencyForecastInfo,
  toFanChartData,
} from "./forecast-presenter";

interface ForecastScreenProps {
  readonly onNavigate?: (tab: NavTabId) => void;
  readonly loader?: ForecastLoader;
}

const CURRENCIES: readonly ForecastCurrency[] = ["USD", "JPY", "EUR"];
const PERIODS: readonly ForecastPeriod[] = ["30D", "90D"];

export function ForecastScreen({ onNavigate, loader }: ForecastScreenProps) {
  const { currency, period, state, setCurrency, setPeriod, reload } =
    useForecast(loader);

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
        message="선택한 통화와 기간의 데이터가 준비되면 이곳에 표시됩니다."
      />
    );
  }

  return (
    <ForecastView
      currency={currency}
      period={period}
      chartData={toFanChartData(state.data)}
      currencyInfo={toCurrencyForecastInfo(state.data, currency)}
      onSelectCurrency={setCurrency}
      onSelectPeriod={setPeriod}
      onNavigate={onNavigate}
    />
  );
}

interface ForecastViewProps {
  readonly currency: ForecastCurrency;
  readonly period: ForecastPeriod;
  readonly chartData: readonly FanChartDataPoint[];
  readonly currencyInfo: CurrencyForecastInfo;
  readonly onSelectCurrency: (currency: ForecastCurrency) => void;
  readonly onSelectPeriod: (period: ForecastPeriod) => void;
  readonly onNavigate?: (tab: NavTabId) => void;
}

function ForecastView({
  currency,
  period,
  chartData,
  currencyInfo,
  onSelectCurrency,
  onSelectPeriod,
  onNavigate,
}: ForecastViewProps) {

  const handleNavigateToPlanner = () => {
    if (onNavigate) {
      onNavigate("planner");
    }
  };

  const { isPercentileWarn } = currencyInfo.summary;

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
        {/* 통화 선택 버튼 그룹 */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {CURRENCIES.map((c) => {
            const isSelected = currency === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectCurrency(c)}
                style={{
                  padding: "0.5rem 1rem",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: isSelected ? "var(--primary)" : "transparent",
                  color: isSelected ? "var(--primary-content)" : "var(--text-muted)",
                  boxShadow: isSelected ? "0 2px 6px var(--primary-subtle)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* 기간 토글 버튼 그룹 */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {PERIODS.map((p) => {
            const isSelected = period === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectPeriod(p)}
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
                {p}
              </button>
            );
          })}
        </div>

        {/* 다음 갱신 안내 */}
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          기준 시각: {currencyInfo.asOfLabel}
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
            시뮬레이션 팬 차트 ({currency}/KRW)
          </h2>
          <div style={{ flex: 1, minHeight: "280px" }}>
            <FanChart data={chartData} currency={currency} />
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
              80% 범위 ({period})
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
              {currencyInfo.summary.lowerLabel} ~ {currencyInfo.summary.upperLabel}
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
              {currencyInfo.summary.percentile}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: "0.375rem",
                fontWeight: 500,
              }}
            >
              {currencyInfo.uncertaintyNote}
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
                1% 움직일 때 ₩{currencyInfo.summary.impact}
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
            {currencyInfo.drivers.length === 0 && (
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                이 통화의 동인 데이터가 아직 제공되지 않습니다.
              </p>
            )}
            {currencyInfo.drivers.map((driver) => {
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
            {currencyInfo.events.length === 0 && (
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                예정된 일정이 없습니다.
              </p>
            )}
            {currencyInfo.events.map((event) => (
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
                  {currencyInfo.modelScore.hitRatePct}%
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 500 }}>
                <span style={{ color: "var(--text-muted)" }}>평균 오차율</span>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  {currencyInfo.modelScore.maePct}%
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 500 }}>
                <span style={{ color: "var(--text-muted)" }}>포함률(80%)</span>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  {currencyInfo.modelScore.inclusion80Pct}%
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
                랜덤워크 대비 +{currencyInfo.modelScore.randomWalkImprovementPct}% 우수
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
