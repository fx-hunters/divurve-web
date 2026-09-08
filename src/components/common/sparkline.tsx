/**
 * 아주 작은 추세선. 축·눈금·툴팁이 없는 의도적으로 빈약한 그림이라,
 * 정확한 값 읽기가 아니라 "최근 흐름" 한눈에 보기만을 맡는다. 정확한 수치는
 * 같은 카드의 현재 환율·80% 범위가 이미 숫자로 보여 준다.
 *
 * 값은 서버가 준 그대로만 그린다. 보간·평활·추세 계산을 하지 않는다(AGENTS.md §1).
 */
interface SparklineProps {
  /** 시간순 관측값. 서버가 준 순서를 그대로 쓴다. */
  readonly rates: readonly number[];
  readonly width?: number;
  readonly height?: number;
  readonly color?: string;
  /** 화면 낭독기용 설명. 그림만으로는 아무것도 읽히지 않으므로 필수다. */
  readonly label: string;
}

/** 선이 위아래 끝에 붙어 잘려 보이지 않도록 남기는 여백(px). */
const VERTICAL_PADDING = 2;

export function Sparkline({
  rates,
  width = 120,
  height = 32,
  color = "var(--primary)",
  label,
}: SparklineProps) {
  // 점이 하나면 선이 아니고, 전부 같은 값이면 진폭이 0이라 그릴 것이 없다.
  if (rates.length < 2) return null;
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  if (min === max) return null;

  const usableHeight = height - VERTICAL_PADDING * 2;
  const stepX = width / (rates.length - 1);
  const points = rates
    .map((rate, index) => {
      const x = index * stepX;
      const y = VERTICAL_PADDING + ((max - rate) / (max - min)) * usableHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
