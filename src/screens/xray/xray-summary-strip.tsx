import { Skeleton } from "../../components/common/skeleton";
import "./xray-layout.css";

/** 스트립 한 칸. 강조색은 판정에 따라 달라지므로 호출부가 정한다. */
export interface XRaySummaryItem {
  readonly key: string;
  readonly label: string;
  /** 아직 서버를 기다리는 중이면 null. 라벨은 그대로 두고 값만 비운다. */
  readonly value: string | null;
  readonly tone?: "default" | "primary" | "danger";
  /**
   * 값 아래 한 줄. 모수나 단위를 덧붙일 때만 쓴다.
   * `undefined` 는 부연이 없는 칸, `null` 은 부연이 있지만 아직 값이 없는 칸이다.
   */
  readonly hint?: string | null;
}

interface XRaySummaryStripProps {
  readonly items: readonly XRaySummaryItem[];
  /** 기준 시각. 스트립 아래 오른쪽에 한 줄로 붙는다. `null` 이면 자리만 잡는다. */
  readonly caption?: string | null;
}

const TONE_CLASSES: Readonly<Record<"default" | "primary" | "danger", string>> = {
  default: "",
  primary: " xray-summary__value--primary",
  danger: " xray-summary__value--danger",
};

/**
 * 두 탭 상단의 요약 스트립.
 *
 * 값은 이미 포맷된 문자열로 받는다 — 이 컴포넌트는 표현만 맡고, 숫자 가공은
 * 프레젠터가 한다(AGENTS.md §7.2).
 */
export function XRaySummaryStrip({ items, caption }: XRaySummaryStripProps) {
  return (
    <div>
      <div className="xray-summary">
        {items.map((item) => (
          <div key={item.key} className="xray-summary__tile">
            <span className="xray-summary__label">{item.label}</span>
            <span className={`xray-summary__value${TONE_CLASSES[item.tone ?? "default"]}`}>
              {item.value ?? <Skeleton width="7rem" />}
            </span>
            {item.hint !== undefined && (
              <span className="xray-summary__hint">
                {item.hint ?? <Skeleton width="5rem" />}
              </span>
            )}
          </div>
        ))}
      </div>
      {caption !== undefined && (
        <p className="xray-summary__caption">
          {caption ?? <Skeleton width="10rem" />}
        </p>
      )}
    </div>
  );
}
