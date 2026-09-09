/**
 * '오늘의 시장' 표현 컴포넌트.
 *
 * props로 받은 값만 그린다. 조회·상태 보관은 `market-summary-section.tsx`가
 * 한다(AGENTS.md §7.2). AI 설명은 children 슬롯으로 받는다.
 */
import type { ReactNode } from "react";
import { Card } from "../../components/common/card";
import { Badge } from "../../components/common/badge";
import { TrendChart } from "../../components/common/trend-chart";
import { Skeleton } from "../../components/common/skeleton";
import type { HomeMarketPairCode } from "../../api/home";
import {
  MARKET_PAIR_OPTIONS,
  resolveMarketPairCode,
  toCurrencyColor,
  toMarketRateLabel,
  toTrendDateLabel,
  type MarketSummaryView,
} from "./home-market";
import "./market-summary-card.css";

interface MarketRateProps {
  readonly view: MarketSummaryView;
  readonly isReloading: boolean;
  readonly errorMessage?: string;
  readonly onRetry: () => void;
}

/** 현재 환율 자리. 재조회 중·실패·값 없음·정상 중 하나만 그린다. */
function MarketRate({
  view,
  isReloading,
  errorMessage,
  onRetry,
}: MarketRateProps) {
  if (isReloading) {
    return (
      <div className="market-summary-card__rate">
        <Skeleton width="11rem" height="2.25rem" />
      </div>
    );
  }

  if (errorMessage !== undefined) {
    return (
      <div className="market-summary-card__error" role="alert">
        <p className="market-summary-card__note">{errorMessage}</p>
        <button
          type="button"
          className="market-summary-card__retry"
          onClick={onRetry}
        >
          시세 다시 불러오기
        </button>
      </div>
    );
  }

  if (view.currentRateLabel === undefined) {
    return (
      <p className="market-summary-card__note">현재 환율을 표시할 수 없습니다.</p>
    );
  }

  return (
    <div className="market-summary-card__rate">
      <span className="market-summary-card__symbol">{view.quoteSymbol}</span>
      <span className="market-summary-card__value">{view.currentRateLabel}</span>
    </div>
  );
}

interface MarketSummaryCardProps {
  readonly view: MarketSummaryView;
  readonly isReloading: boolean;
  readonly errorMessage?: string;
  readonly onSelectPairCode: (pairCode: HomeMarketPairCode) => void;
  readonly onRetry: () => void;
  /** 카드 아래에 붙는 AI 자연어 설명 자리. */
  readonly children?: ReactNode;
}

export function MarketSummaryCard({
  view,
  isReloading,
  errorMessage,
  onSelectPairCode,
  onRetry,
  children,
}: MarketSummaryCardProps) {
  const hasBand = view.lowerLabel !== undefined && view.upperLabel !== undefined;

  return (
    <Card
      title="오늘의 시장"
      className="market-summary-card"
      highlight
      action={
        <select
          className="market-summary-card__select"
          aria-label="통화쌍"
          value={view.pairCode}
          onChange={(event) =>
            onSelectPairCode(resolveMarketPairCode(event.target.value))
          }
        >
          {MARKET_PAIR_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      }
    >
      <div className="market-summary-card__body">
        <p className="market-summary-card__pair">
          <span style={{ color: toCurrencyColor(view.baseCurrencyCode) }}>
            {view.baseCurrencyCode}
          </span>
          <span className="market-summary-card__pair-separator">/</span>
          <span style={{ color: toCurrencyColor(view.quoteCurrencyCode) }}>
            {view.quoteCurrencyCode}
          </span>
        </p>

        <MarketRate
          view={view}
          isReloading={isReloading}
          errorMessage={errorMessage}
          onRetry={onRetry}
        />

        {/* 범위가 없어도 자리는 남긴다 — 값이 들어올 때 아래가 밀리지 않는다. */}
        {!hasBand && isReloading && (
          <div>
            <Skeleton width="13rem" height="1.5rem" />
          </div>
        )}
        {hasBand && (
          <div>
            <Badge variant="primary">
              80% 범위 {view.lowerLabel} - {view.upperLabel}
            </Badge>
          </div>
        )}

        {/*
          최근 영업일 추세. 값이 하나뿐이거나 전부 같으면 변환 계층이 빈 배열을
          주므로 여기서 그림이 사라진다 — 평평한 선으로 "변동이 없다"는 인상을
          주지 않기 위해서다.
        */}
        {view.trendPoints.length === 0 && isReloading && (
          <Skeleton
            shape="block"
            height="100%"
            className="market-summary-card__chart"
          />
        )}
        {view.trendPoints.length > 0 && (
          <TrendChart
            className="market-summary-card__chart"
            points={view.trendPoints}
            color={toCurrencyColor(view.baseCurrencyCode)}
            formatRate={(rate) => toMarketRateLabel(view.pairCode, rate)}
            formatDate={toTrendDateLabel}
            label={`${view.baseCurrencyCode}/${view.quoteCurrencyCode} 최근 ${view.trendPoints.length}영업일 추세`}
          />
        )}

        {children}
      </div>
    </Card>
  );
}
