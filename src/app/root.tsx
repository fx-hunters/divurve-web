/**
 * 최상위 진입점.
 *
 * `/admin` 아래는 사용자 앱 셸과 완전히 분리된 임시 운영 콘솔이므로,
 * 탭 내비게이션에 끼워 넣지 않고 여기서 갈라낸다.
 *
 * 콜드 스타트 배너는 두 앱 어느 쪽에서 요청이 나가든 떠야 하므로 갈림길 위에
 * 둔다.
 */
import { ColdStartBanner } from "../components/common/cold-start-banner";
import { AdminApp } from "../screens/admin/admin-app";
import { isAdminPath } from "../screens/admin/admin-routing";
import { App } from "./app";

interface RootProps {
  /** 테스트에서 경로를 주입하기 위한 통로. */
  readonly pathname?: string;
}

export function Root({ pathname = window.location.pathname }: RootProps = {}) {
  return (
    <>
      <ColdStartBanner />
      {isAdminPath(pathname) ? <AdminApp /> : <App />}
    </>
  );
}
