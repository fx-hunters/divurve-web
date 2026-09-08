import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

/** 분해 도넛의 조각 하나. `value` 는 비율이 아니라 크기이고, 각도는 합계로 나눠 낸다. */
export interface DonutSegment {
  readonly key: string;
  readonly value: number;
  readonly color: string;
}

interface DonutChartCommonProps {
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly label?: string;
  readonly className?: string;
  readonly isAnimationActive?: boolean;
  readonly animationDuration?: number;
}

/** 값 하나를 트랙 위에 얹는 게이지 링. 가운데에 숫자를 쓴다. */
interface DonutChartGaugeProps extends DonutChartCommonProps {
  /** 0 ~ 100 사이의 퍼센트 값 */
  readonly percent: number;
  readonly color?: string;
  readonly trackColor?: string;
  readonly segments?: never;
}

/**
 * 여러 조각으로 나눈 분해 도넛. 가운데 숫자는 쓰지 않는다 — 조각마다 값이
 * 달라 하나를 고를 근거가 없고, 수치는 옆의 목록이 이미 보여 준다.
 */
interface DonutChartSegmentsProps extends DonutChartCommonProps {
  readonly segments: readonly DonutSegment[];
  readonly percent?: never;
  readonly color?: never;
  readonly trackColor?: never;
}

/**
 * 두 쓰임을 유니온으로 갈라 둔다 — `percent` 와 `segments` 를 함께 넘기는
 * 불가능한 상태를 타입이 막는다(AGENTS.md §7.4).
 */
type DonutChartProps = DonutChartGaugeProps | DonutChartSegmentsProps;

/** 조각 하나를 recharts 가 먹는 모양으로. 화면에 안 보이는 `name` 은 키로만 쓴다. */
interface ChartSlice {
  readonly name: string;
  readonly value: number;
  readonly fill: string;
}

export function DonutChart(props: DonutChartProps) {
  const {
    size = 128,
    strokeWidth = 14,
    label,
    className = "",
    isAnimationActive = true,
    animationDuration = 800,
  } = props;

  const outerRadius = size / 2;
  const innerRadius = Math.max(0, outerRadius - strokeWidth);
  const animDelay = Math.max(0, animationDuration - 100);

  // 두 쓰임이 각도를 만드는 방식만 다르고 그리는 링은 같다.
  let slices: readonly ChartSlice[];
  let centerPercent: number | null = null;
  let defaultLabel: string;

  if (props.segments === undefined) {
    const clampedPercent = Math.min(Math.max(props.percent, 0), 100);
    centerPercent = clampedPercent;
    defaultLabel = `외화 비중 ${Math.round(clampedPercent)}%`;
    slices = [
      {
        name: "value",
        value: Number(clampedPercent.toFixed(1)),
        fill: props.color ?? "var(--usd)",
      },
      {
        name: "track",
        value: Number((100 - clampedPercent).toFixed(1)),
        fill: props.trackColor ?? "var(--border)",
      },
    ];
  } else {
    // 조각이 없거나 합이 0이면 각도를 낼 수 없다. 빈 상태 문구는 부모가 맡는다.
    const total = props.segments.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) return null;
    defaultLabel = "통화별 비중";
    slices = props.segments.map((item) => ({
      name: item.key,
      value: item.value,
      fill: item.color,
    }));
  }

  return (
    <div
      className={`donut-chart relative flex items-center justify-center shrink-0 ${className}`}
      style={{
        position: "relative",
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label={label ?? defaultLabel}
      role="img"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <PieChart>
          <Pie
            data={slices as ChartSlice[]}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing="ease-out"
          >
            {slices.map((slice) => (
              <Cell key={slice.name} fill={slice.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* 중앙 텍스트 - 파이 차트 회전 완료 타이밍에 맞춰 페이드 인 */}
      {centerPercent !== null && (
        <div
          className="absolute flex items-baseline justify-center pointer-events-none"
          style={{
            position: "absolute",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            color: "var(--text)",
            opacity: isAnimationActive ? 0 : 1,
            animation: isAnimationActive
              ? `donutNumberFadeIn 0.35s var(--ease-out-smooth) ${animDelay}ms forwards`
              : undefined,
          }}
        >
          <span style={{ fontSize: `${size * 0.22}px` }}>{Math.round(centerPercent)}</span>
          <span style={{ fontSize: `${size * 0.12}px`, color: "var(--text-muted)", marginLeft: "1px" }}>%</span>
        </div>
      )}
    </div>
  );
}
