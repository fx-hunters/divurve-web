/**
 * 최근 추세 꺾은선. 가로·세로 축과 눈금을 함께 그린다.
 *
 * 스파크라인(축 없는 축소 그림)을 대신한다. 카드 폭을 다 쓰는 크기가 되면
 * "대략의 흐름"만 보여 주는 것으로는 모자라고, 눈금 없이 큰 그림은 값을 읽을
 * 수 있다는 착각을 준다.
 *
 * 값은 서버가 준 그대로만 그린다. 보간·평활·추세 계산을 하지 않는다
 * (AGENTS.md §1). 여기서 하는 계산은 좌표 환산뿐이다.
 *
 * 세로축은 하나다 — 듀얼 액스는 금지다(개발 컨벤션 7.3).
 */

export interface TrendPoint {
  readonly date: string;
  readonly rate: number;
}

interface TrendChartProps {
  /** 시간순 관측값. 서버가 준 순서를 그대로 쓴다. */
  readonly points: readonly TrendPoint[];
  readonly color?: string;
  /** 세로축 눈금 문구. 통화쌍마다 소수 자릿수가 다르므로 밖에서 넘긴다. */
  readonly formatRate: (rate: number) => string;
  /** 가로축 눈금 문구. */
  readonly formatDate: (isoDate: string) => string;
  /** 화면 낭독기용 설명. 그림만으로는 아무것도 읽히지 않으므로 필수다. */
  readonly label: string;
}

/* 좌표계. 실제 크기는 CSS가 정하고 이 값은 비율만 잡는다. */
const VIEW_WIDTH = 480;
const VIEW_HEIGHT = 220;
/** 세로축 문구 자리. */
const PADDING_LEFT = 52;
/** 가로축 문구 자리. */
const PADDING_BOTTOM = 22;
const PADDING_TOP = 10;
const PADDING_RIGHT = 8;

const PLOT_WIDTH = VIEW_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

/** 세로 눈금 개수. 최소·중간·최대 세 줄이면 범위와 현재 위치가 읽힌다. */
const Y_TICKS = 3;

function toYTickRates(min: number, max: number): readonly number[] {
  const step = (max - min) / (Y_TICKS - 1);
  return Array.from({ length: Y_TICKS }, (_, index) => min + step * index);
}

/** 가로 눈금으로 쓸 인덱스. 처음·가운데·끝만 적어 글자가 겹치지 않게 한다. */
function toXTickIndexes(length: number): readonly number[] {
  const last = length - 1;
  const middle = Math.floor(last / 2);
  return middle === 0 || middle === last ? [0, last] : [0, middle, last];
}

export function TrendChart({
  points,
  color = "var(--primary)",
  formatRate,
  formatDate,
  label,
}: TrendChartProps) {
  // 점이 하나면 선이 아니고, 전부 같은 값이면 진폭이 0이라 그릴 것이 없다.
  if (points.length < 2) return null;
  const rates = points.map((point) => point.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  if (min === max) return null;

  const toX = (index: number) =>
    PADDING_LEFT + (index / (points.length - 1)) * PLOT_WIDTH;
  const toY = (rate: number) =>
    PADDING_TOP + ((max - rate) / (max - min)) * PLOT_HEIGHT;

  const line = points
    .map((point, index) => `${toX(index).toFixed(1)},${toY(point.rate).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      {/* 가로 눈금선. 값을 가리지 않도록 옅게 둔다. */}
      {toYTickRates(min, max).map((rate) => (
        <g key={`y-${rate}`}>
          <line
            x1={PADDING_LEFT}
            x2={VIEW_WIDTH - PADDING_RIGHT}
            y1={toY(rate)}
            y2={toY(rate)}
            stroke="var(--border-subtle)"
            strokeWidth={1}
          />
          <text
            x={PADDING_LEFT - 8}
            y={toY(rate)}
            textAnchor="end"
            dominantBaseline="middle"
            fill="var(--text-muted)"
            fontSize={11}
          >
            {formatRate(rate)}
          </text>
        </g>
      ))}

      {/* 축선 */}
      <line
        x1={PADDING_LEFT}
        x2={PADDING_LEFT}
        y1={PADDING_TOP}
        y2={PADDING_TOP + PLOT_HEIGHT}
        stroke="var(--border)"
        strokeWidth={1}
      />
      <line
        x1={PADDING_LEFT}
        x2={VIEW_WIDTH - PADDING_RIGHT}
        y1={PADDING_TOP + PLOT_HEIGHT}
        y2={PADDING_TOP + PLOT_HEIGHT}
        stroke="var(--border)"
        strokeWidth={1}
      />

      {toXTickIndexes(points.length).map((index) => (
        <text
          key={`x-${index}`}
          x={toX(index)}
          y={VIEW_HEIGHT - 6}
          textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
          fill="var(--text-muted)"
          fontSize={11}
        >
          {formatDate(points[index]!.date)}
        </text>
      ))}

      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
