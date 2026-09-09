/**
 * 운영 현황 대시보드.
 *
 * 지금은 진입 자리만 잡아 둔 껍데기다 — 지표 카드는 #84, 가입자 추이는
 * #94가 채운다. 두 이슈가 이 파일 하나만 건드리도록 #93에서 미리 만들었다.
 */
import type { AdminAuthFailure } from "../admin-errors";

interface AdminDashboardScreenProps {
  /** 지표를 붙일 때 401·403을 위로 알리는 통로. 껍데기라 아직 부르지 않는다. */
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}

export function AdminDashboardScreen({ onAuthFailure }: AdminDashboardScreenProps) {
  // 아직 서버를 부르지 않으므로 인증 실패도 없다. 내용이 붙을 때
  // 이 통로를 그대로 쓰면 되도록 참조만 유지한다.
  void onAuthFailure;

  return (
    <section className="admin-section">
      <h1 className="admin-section__title">운영 현황</h1>
      <p className="admin-empty">
        지표를 붙이는 중입니다. 그동안 각 화면에서 직접 확인해 주세요.
      </p>
    </section>
  );
}
