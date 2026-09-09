/**
 * 운영 현황 대시보드 (이슈 #84).
 *
 * 카드마다 따로 부른다 — 하나가 실패해도 나머지는 그대로 선다. 한 번에 묶어
 * 부르면 AI 집계가 죽었을 때 환율 상태까지 못 보게 된다.
 *
 * 카드가 늘면서 이 파일이 God Component 로 커지지 않도록 카드마다 파일을
 * 갈랐다(AGENTS.md 7.2). 여기는 배치만 한다.
 *
 * 일자별 가입 추이는 백엔드 신규 API 가 필요해 #94 로, IP 별 사용 현황은
 * #103 으로 갈랐다.
 */
import type { AdminAuthFailure } from "../admin-errors";
import { AiCallCard } from "./cards/ai-card";
import { GapCard } from "./cards/gap-card";
import { RefreshCard } from "./cards/refresh-card";

interface AdminDashboardScreenProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}

export function AdminDashboardScreen({
  onAuthFailure,
}: AdminDashboardScreenProps) {
  return (
    <section className="admin-section">
      <h1 className="admin-section__title">운영 현황</h1>
      <div className="admin-metric-grid">
        <AiCallCard onAuthFailure={onAuthFailure} />
        <RefreshCard onAuthFailure={onAuthFailure} />
        <GapCard onAuthFailure={onAuthFailure} />
      </div>
    </section>
  );
}
