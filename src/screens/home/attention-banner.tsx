/**
 * 경제 일정 띠.
 *
 * 카드가 아니라 한 줄짜리 띠다. 예전에는 화면 맨 아래 430px 카드였는데,
 * "주의 필요"가 붙은 정보가 스크롤해야 보이면 알림 구실을 못 한다. 일정 칩을
 * 가로로 눕혀 헤드라인 바로 아래에 놓는다 — 일정이 늘어도 띠 높이는 그대로고,
 * 넘치는 칩은 가로로 밀린다.
 *
 * 국면 배지를 여기 두지 않는 이유: 백엔드가 `today.badge` 와
 * `attention.regime_badge` 를 같은 `regime.badge()` 로 채운다. 바로 위
 * '오늘의 핵심' 띠에 이미 같은 값이 있어서, 여기 또 두면 같은 글자가 24px
 * 간격으로 두 번 보인다. 게다가 표제가 "주의 필요"로 고정돼 있어 국면이
 * 정상일 때 "주의 필요 · 정상"이라는 모순된 줄이 됐다.
 *
 * 표현 전용이다. props로 받은 값만 그린다(AGENTS.md §7.2).
 */
import { Card } from "../../components/common/card";
import { Badge } from "../../components/common/badge";
import type { AttentionData } from "../../types/home";
import "./attention-banner.css";

const TITLE = "경제 일정";
const EMPTY_LABEL = "예정된 일정이 없습니다.";
const RANGE_LINK_LABEL = "환율 범위 확인하기 →";

interface AttentionBannerProps {
  readonly data: AttentionData;
  readonly onNavigateToRange?: () => void;
}

export function AttentionBanner({ data, onNavigateToRange }: AttentionBannerProps) {
  return (
    <Card
      title={TITLE}
      className="attention-strip"
      action={
        onNavigateToRange && (
          <button
            type="button"
            className="attention-strip__link"
            onClick={onNavigateToRange}
          >
            {RANGE_LINK_LABEL}
          </button>
        )
      }
    >
      {data.events.length === 0 ? (
        <p className="attention-strip__empty">{EMPTY_LABEL}</p>
      ) : (
        <ul className="attention-strip__events" aria-label="다가오는 경제 일정">
          {data.events.map((event) => (
            <li
              className="attention-strip__event"
              key={`${event.dateLabel}-${event.title}`}
              data-severity={event.severity}
            >
              <span className="attention-strip__event-date">
                {event.currencyCode} · {event.dateLabel}
              </span>
              <span className="attention-strip__event-title">{event.title}</span>
              <Badge variant={event.severity === "고변동성" ? "danger" : "warn"}>
                {event.severity}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
