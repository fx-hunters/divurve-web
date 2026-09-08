const DEFAULT_SIZE = 28;
const DEFAULT_LABEL = "불러오는 중";

interface SpinnerProps {
  /** 스피너 한 변의 픽셀 크기 */
  readonly size?: number;
  /** 스크린리더에 읽히는 상태 문구 */
  readonly label?: string;
}

/**
 * API 요청과 응답 사이에 표시하는 공용 원형 로딩 스피너.
 * 회전 애니메이션과 `prefers-reduced-motion` 대응은 `styles/tokens.css`의
 * `.divurve-spinner__icon` 규칙이 담당한다.
 */
export function Spinner({
  size = DEFAULT_SIZE,
  label = DEFAULT_LABEL,
}: SpinnerProps) {
  return (
    <span
      className="divurve-spinner"
      role="status"
      aria-label={label}
      style={{ display: "inline-flex", lineHeight: 0 }}
    >
      <svg
        className="divurve-spinner__icon"
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="var(--border)"
          strokeWidth="3"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
