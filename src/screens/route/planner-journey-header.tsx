/**
 * 플래너 화면 머리말.
 *
 * 서버 응답을 기다리는 동안에도 같은 머리말을 세워야 해서, 여정 화면 밖으로
 * 빼 두고 두 곳에서 함께 쓴다. 문구가 두 벌로 갈라지지 않는 것이 목적이다.
 */
import { DataSourceBadge } from "../../components/common/data-source-badge";
import type { DataSourceKind } from "../../types/data-source";

interface PlannerJourneyHeaderProps {
  readonly kind: DataSourceKind;
  /** 출처 설명 한 줄. 아직 출처를 모르면 생략한다. */
  readonly description?: string;
}

export function PlannerJourneyHeader({
  kind,
  description,
}: PlannerJourneyHeaderProps) {
  return (
    <header className="planner-api__header">
      <div>
        <p className="planner-api-journey__eyebrow">DIVURVE</p>
        <h1>내 외화 플래너</h1>
        {description !== undefined && <p>{description}</p>}
      </div>
      <DataSourceBadge kind={kind} />
    </header>
  );
}
