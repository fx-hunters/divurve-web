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
 *
 * 크기는 부모가 준 자리를 그대로 쓴다. `viewBox`를 실제 픽셀 크기에 맞춰
 * 다시 잡으므로 1 좌표 = 1px이고, 늘어나도 글자와 선 굵기가 그대로다.
 * (`preserveAspectRatio="none"` 으로 늘리면 눈금 글자까지 찌그러진다.)
 */
import { useElementSize } from "../../hooks/use-element-size";
import "./trend-chart.css";

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
  /** 자리 배치는 바깥이 정한다(예: flex 아이템으로 남는 높이 흡수). */
  readonly className?: string;
}

/** 아직 측정하지 못했을 때 쓰는 크기. 측정되면 실제 픽셀로 대체된다. */
const FALLBACK_WIDTH = 480;
const FALLBACK_HEIGHT = 220;

/** 축 문구가 겹치기 시작하는 하한. 이보다 좁으면 눈금이 서로 먹는다. */
const MIN_WIDTH = 240;
const MIN_HEIGHT = 140;

/** 세로축 문구 자리. */
const PADDING_LEFT = 52;
/** 가로축 문구 자리. */
const PADDING_BOTTOM = 22;
const PADDING_TOP = 10;
const PADDING_RIGHT = 8;

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
  className = "",
}: TrendChartProps) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  // 점이 하나면 선이 아니고, 전부 같은 값이면 진폭이 0이라 그릴 것이 없다.
  if (points.length < 2) return null;
  const rates = points.map((point) => point.rate);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  if (min === max) return null;

  const viewWidth = Math.max(size?.width ?? FALLBACK_WIDTH, MIN_WIDTH);
  const viewHeight = Math.max(size?.height ?? FALLBACK_HEIGHT, MIN_HEIGHT);
  const plotWidth = viewWidth - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = viewHeight - PADDING_TOP - PADDING_BOTTOM;

  const toX = (index: number) =>
    PADDING_LEFT + (index / (points.length - 1)) * plotWidth;
  const toY = (rate: number) =>
    PADDING_TOP + ((max - rate) / (max - min)) * plotHeight;

  const line = points
    .map((point, index) => `${toX(index).toFixed(1)},${toY(point.rate).toFixed(1)}`)
    .join(" ");

  return (
    <div className={`trend-chart ${className}`.trim()} ref={ref}>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="trend-chart__canvas"
      >
        {/* 가로 눈금선. 값을 가리지 않도록 옅게 둔다. */}
        {toYTickRates(min, max).map((rate) => (
          <g key={`y-${rate}`}>
            <line
              x1={PADDING_LEFT}
              x2={viewWidth - PADDING_RIGHT}
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
          y2={PADDING_TOP + plotHeight}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <line
          x1={PADDING_LEFT}
          x2={viewWidth - PADDING_RIGHT}
          y1={PADDING_TOP + plotHeight}
          y2={PADDING_TOP + plotHeight}
          stroke="var(--border)"
          strokeWidth={1}
        />

        {toXTickIndexes(points.length).map((index) => (
          <text
            key={`x-${index}`}
            x={toX(index)}
            y={viewHeight - 6}
            textAnchor={
              index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"
            }
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
    </div>
  );
}
