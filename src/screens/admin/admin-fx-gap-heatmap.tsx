/**
 * 환율 시계열 결측 히트맵.
 *
 * 지금은 진입 자리만 잡아 둔 껍데기다 — 히트맵과 백필 연결은 #85가 채운다.
 * 조회·백필 클라이언트는 `api/admin-fx-gaps.ts`에 이미 있다(#93).
 */
import type { AdminAuthFailure } from "./admin-errors";

interface AdminFxGapHeatmapProps {
  /** 조회를 붙일 때 401·403을 위로 알리는 통로. 껍데기라 아직 부르지 않는다. */
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}

export function AdminFxGapHeatmap({ onAuthFailure }: AdminFxGapHeatmapProps) {
  // 아직 서버를 부르지 않으므로 인증 실패도 없다. 내용이 붙을 때
  // 이 통로를 그대로 쓰면 되도록 참조만 유지한다.
  void onAuthFailure;

  return (
    <section className="admin-section">
      <h1 className="admin-section__title">환율 결측</h1>
      <p className="admin-empty">
        결측 구간을 그리는 중입니다. 그동안 환율 시계열 화면에서 확인해
        주세요.
      </p>
    </section>
  );
}
