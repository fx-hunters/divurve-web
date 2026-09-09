/**
 * 값이 들어갈 자리를 잡아 두는 막대.
 *
 * 로딩 중에도 카드 제목·버튼·표 머리글은 실제로 렌더하고, API 값이 들어가는
 * 자리만 이 컴포넌트로 채운다. 카드를 통째로 덮지 않는다.
 *
 * 항상 `aria-hidden` 이다. 상태 안내는 화면 컨테이너가 `.sr-only` 한 줄로
 * 한 번만 읽어 준다(styles/layout.css).
 */
import "./skeleton.css";

export type SkeletonShape = "line" | "block" | "circle";

interface SkeletonProps {
  /** line=글 한 줄, block=차트·표 같은 면, circle=도넛·아바타. */
  readonly shape?: SkeletonShape;
  /** CSS 길이. 생략하면 가로를 다 쓴다. */
  readonly width?: string;
  /** CSS 길이. 생략하면 shape 별 기본 높이를 CSS 가 정한다. */
  readonly height?: string;
  /** 배치용 클래스. 색·모양은 여기서 덮지 않는다. */
  readonly className?: string;
}

export function Skeleton({
  shape = "line",
  width,
  height,
  className = "",
}: SkeletonProps) {
  return (
    <span
      className={`divurve-skeleton divurve-skeleton--${shape} ${className}`.trim()}
      aria-hidden="true"
      style={{ width, height }}
    />
  );
}

interface SkeletonTextProps {
  /** 그릴 줄 수. */
  readonly lines?: number;
  /** 마지막 줄 폭. 짧게 끊어야 문단처럼 읽힌다. */
  readonly lastLineWidth?: string;
  readonly className?: string;
}

export function SkeletonText({
  lines = 2,
  lastLineWidth = "60%",
  className = "",
}: SkeletonTextProps) {
  return (
    <span className={`divurve-skeleton-text ${className}`.trim()}>
      {/*
        길이가 고정이고 삽입·재정렬이 없는 목록이라 index 를 key 로 쓴다
        (AGENTS.md §7.6 의 예외).
      */}
      {Array.from({ length: lines }, (_unused, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : undefined}
        />
      ))}
    </span>
  );
}
