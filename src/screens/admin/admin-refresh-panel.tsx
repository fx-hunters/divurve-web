/**
 * 2-4. 수동 갱신.
 *
 * 두 카드(ECOS 환율 / FRED 거시지표)를 세우고, 둘이 함께 쓰는 "마지막 갱신
 * 시각" 조회만 여기서 한 번 한다. 각 카드는 자기 갱신이 끝나면 이 조회를
 * 다시 돌리도록 알린다.
 */
import { useCallback, useEffect } from "react";
import { fetchAdminRefreshStatus } from "../../api/admin";
import type { AdminAuthFailure } from "./admin-errors";
import { AdminFxRefreshCard } from "./admin-fx-refresh-card";
import { AdminMacroRefreshCard } from "./admin-macro-refresh-card";
import { useAdminRequest } from "./use-admin-request";

interface AdminRefreshPanelProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}

export function AdminRefreshPanel({ onAuthFailure }: AdminRefreshPanelProps) {
  const { state, send } = useAdminRequest(
    fetchAdminRefreshStatus,
    onAuthFailure,
  );

  const loadStatus = useCallback(() => {
    void send();
  }, [send]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  return (
    <>
      <AdminFxRefreshCard
        onAuthFailure={onAuthFailure}
        statusState={state}
        onRefreshed={loadStatus}
      />
      <AdminMacroRefreshCard
        onAuthFailure={onAuthFailure}
        statusState={state}
        onRefreshed={loadStatus}
      />
    </>
  );
}
