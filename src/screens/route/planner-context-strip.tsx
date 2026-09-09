/**
 * 플래너 상단의 배경 정보 띠.
 *
 * 표현만 한다 — props 말고는 아무것도 읽지 않는다(AGENTS.md §7.2). 표시할 값이
 * 하나도 없으면 빈 껍데기를 그리지 않고 아무것도 그리지 않는다.
 */
import type { PlannerContextViewModel } from "./planner-context-presenter";

interface PlannerContextStripProps {
  readonly context: PlannerContextViewModel;
}

export function PlannerContextStrip({ context }: PlannerContextStripProps) {
  if (context.facts.length === 0) return null;

  return (
    <section className="planner-api__context" aria-label="계획 배경 정보">
      <dl className="planner-api__context-facts">
        {context.facts.map((item) => (
          <div key={item.id}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {context.asOfLabel !== null && (
        <p className="planner-api__context-as-of">
          기준 {context.asOfLabel} · 계획 계산과 같은 환율 전제입니다.
        </p>
      )}
    </section>
  );
}
