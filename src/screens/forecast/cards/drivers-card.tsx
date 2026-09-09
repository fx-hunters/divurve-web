import { Skeleton } from "../../../components/common/skeleton";
import type { ForecastDriverItem } from "../../../types/forecast";
import { CARD_PADDING, CARD_SURFACE, CARD_TITLE } from "./card-surface";

/** 기여 방향별 막대 색. 상태색 배정은 컨벤션 7.2 를 따른다. */
const BAR_COLORS: Readonly<Record<ForecastDriverItem["type"], string>> = {
  danger: "var(--danger)",
  normal: "var(--normal)",
  muted: "var(--text-muted)",
};

/** 로딩 중 세워 둘 자리표시자 행 수. 실제 동인 개수와 대략 맞춘다. */
const PLACEHOLDER_ROWS = [0, 1, 2];

interface DriversCardProps {
  /** null 이면 아직 서버를 기다리는 중이다. 빈 배열은 '동인 없음'을 뜻한다. */
  readonly drivers: readonly ForecastDriverItem[] | null;
}

/**
 * 전망 동인 카드. props 만 받아 그린다(§7.2).
 *
 * 값이 없어도 카드와 제목은 그대로 선다 — 로딩 중에 사라지는 것은 행뿐이다.
 */
export function DriversCard({ drivers }: DriversCardProps) {
  return (
    <div style={{ ...CARD_SURFACE, padding: CARD_PADDING }}>
      <h3 style={{ ...CARD_TITLE, marginBottom: "1rem" }}>전망 동인</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {drivers === null &&
          PLACEHOLDER_ROWS.map((row) => (
            <div
              key={row}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.875rem",
              }}
            >
              <Skeleton width="6rem" />
              <Skeleton width="4rem" height="8px" />
            </div>
          ))}
        {drivers?.length === 0 && (
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
            이 통화쌍의 동인 데이터가 아직 제공되지 않습니다.
          </p>
        )}
        {drivers?.map((driver) => {
          const barColor = BAR_COLORS[driver.type];
          return (
            <div
              key={driver.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              <span style={{ color: "var(--text)" }}>{driver.name}</span>
              <div
                style={{
                  width: `min(${driver.barWidthPx}px, 100px)`,
                  height: "8px",
                  flex: "0 0 auto",
                  backgroundColor: barColor,
                  borderRadius: "var(--radius-full)",
                  boxShadow: `0 0 4px ${barColor}`,
                  transition:
                    "width 0.5s var(--ease-out-smooth), background-color 0.3s ease",
                  transformOrigin: "left",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
