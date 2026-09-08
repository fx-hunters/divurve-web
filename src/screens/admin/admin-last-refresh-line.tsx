/**
 * "마지막 갱신 — …" 한 줄.
 *
 * 갱신 응답의 `refreshedAt`은 버튼을 누른 그 응답에만 실려 있어, 화면에 막
 * 들어온 관리자는 마지막 갱신이 언제였는지 알 수 없었다. 이 줄은 서버에 남아
 * 있는 값을 읽어 그 자리를 메운다.
 *
 * props만 받는 표현 컴포넌트다(AGENTS.md 7.2).
 */
import type { AdminRefreshStatus } from "../../api/admin";
import { formatAdminDateTime } from "./admin-datetime";
import { isAdminEndpointMissing } from "./admin-errors";
import type { AdminRequestState } from "./use-admin-request";

interface AdminLastRefreshLineProps {
  readonly state: AdminRequestState<AdminRefreshStatus>;
  /** 이 카드가 볼 값을 상태에서 꺼낸다. */
  readonly selectValue: (status: AdminRefreshStatus) => string | null;
  /** 서버에 값이 없을 때 그 사유를 대신 적는다. */
  readonly unavailableLabel: string;
}

export function AdminLastRefreshLine({
  state,
  selectValue,
  unavailableLabel,
}: AdminLastRefreshLineProps) {
  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return <p className="admin-last-refresh">마지막 갱신 — 확인 중</p>;
  }

  if (state.status === "error") {
    // 부가 정보다. 갱신 자체는 여전히 가능하므로 붉게 세우지 않는다.
    return (
      <p className="admin-last-refresh">
        마지막 갱신 —{" "}
        {isAdminEndpointMissing(state.error)
          ? "서버가 아직 제공하지 않습니다."
          : state.error.message}
      </p>
    );
  }

  const value = selectValue(state.result.data);
  return (
    <p className="admin-last-refresh">
      마지막 갱신 —{" "}
      {value === null ? unavailableLabel : formatAdminDateTime(value)}
    </p>
  );
}
