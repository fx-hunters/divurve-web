/**
 * 가입자 카드 (이슈 #99).
 *
 * 총계·실계정·데모를 **각각 서버가 센다**. 목록을 받아 프론트에서 세면 페이지
 * 상한에 걸려 부분 집계가 되고, 그 숫자가 사실과 달라진다. `size=1`로 받아
 * `totalElements`만 읽는다.
 *
 * 일자별 추이는 백엔드 신규 API 가 필요해 #94 로 갈랐다.
 */
import { useCallback, useEffect } from "react";
import { fetchAdminUsers, type AdminUserPage } from "../../../../api/admin";
import { formatAdminValue } from "../../admin-value";
import { useAdminRequest } from "../../use-admin-request";
import { AdminMetricCard } from "../admin-metric-card";
import {
  COUNT_ONLY_PAGE,
  dataOf,
  errorOf,
  isLoadingOf,
  type AdminCardProps,
} from "./card-state";

export function SignupCard({ onAuthFailure }: AdminCardProps) {
  const total = useAdminRequest<[], AdminUserPage>(
    useCallback(() => fetchAdminUsers(COUNT_ONLY_PAGE), []),
    onAuthFailure,
  );
  const real = useAdminRequest<[], AdminUserPage>(
    useCallback(
      () => fetchAdminUsers({ ...COUNT_ONLY_PAGE, isDemo: false }),
      [],
    ),
    onAuthFailure,
  );
  const demo = useAdminRequest<[], AdminUserPage>(
    useCallback(() => fetchAdminUsers({ ...COUNT_ONLY_PAGE, isDemo: true }), []),
    onAuthFailure,
  );

  const { send: sendTotal } = total;
  const { send: sendReal } = real;
  const { send: sendDemo } = demo;
  useEffect(() => {
    void sendTotal();
    void sendReal();
    void sendDemo();
  }, [sendTotal, sendReal, sendDemo]);

  const totalCount = dataOf(total.state)?.totalElements ?? null;
  const realCount = dataOf(real.state)?.totalElements ?? null;
  const demoCount = dataOf(demo.state)?.totalElements ?? null;

  return (
    <AdminMetricCard
      title="가입자"
      headline={`${formatAdminValue(totalCount)}명`}
      isLoading={isLoadingOf(total.state)}
      error={errorOf(total.state)}
    >
      <dl className="admin-kv admin-kv--inline">
        <div className="admin-kv__pair">
          <dt>실계정</dt>
          <dd>{formatAdminValue(realCount)}명</dd>
        </div>
        <div className="admin-kv__pair">
          <dt>데모</dt>
          <dd>{formatAdminValue(demoCount)}명</dd>
        </div>
      </dl>
    </AdminMetricCard>
  );
}
