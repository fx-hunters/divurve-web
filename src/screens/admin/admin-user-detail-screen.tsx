/**
 * 2-2. 사용자 상세 데이터.
 *
 * 응답에 들어 있는 키를 고르지 않고 전부 컬럼으로 세운다. 배열이 비어도
 * 섹션은 남긴다 — 테이블이 사라지면 "비어 있는 것"과 "부르지 않은 것"을
 * 구분할 수 없기 때문이다.
 *
 * 소유자 참조는 `ownerId`(UUID)로만 온다. 사용자 이름을 다시 붙이지 않는다.
 */
import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminUser,
  fetchAdminUserData,
  type AdminRecord,
  type AdminUser,
} from "../../api/admin";
import type { AdminAuthFailure } from "./admin-errors";
import {
  AdminErrorPanel,
  AdminLoadingPanel,
  AdminMetaLine,
  AdminSection,
} from "./admin-panels";
import { AdminTable, type AdminColumn } from "./admin-table";
import { collectAdminColumns, formatAdminValue } from "./admin-value";
import { useAdminRequest } from "./use-admin-request";

interface AdminUserDetailScreenProps {
  readonly userId: string;
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
  readonly onBack: () => void;
}

function toColumns(
  rows: readonly AdminRecord[],
): readonly AdminColumn<AdminRecord>[] {
  return collectAdminColumns(rows).map((key) => ({ key }));
}

interface AdminDomainSectionProps {
  readonly domain: string;
  readonly rows: readonly AdminRecord[];
}

function AdminDomainSection({ domain, rows }: AdminDomainSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="admin-domain">
      <button
        type="button"
        className="admin-domain__head"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <span className="admin-domain__name">{domain}</span>
        <span className="admin-domain__count">{rows.length}건</span>
        <span aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
      </button>
      {isOpen && (
        <AdminTable
          columns={toColumns(rows)}
          rows={rows}
          getRowKey={(_row, index) => `${domain}-${index}`}
          emptyLabel="없음"
        />
      )}
    </div>
  );
}

/** 계정 요약. 목록과 같은 항목을 같은 순서로 보여준다. */
function AdminUserSummary({ user }: { readonly user: AdminUser }) {
  const entries: readonly (readonly [string, unknown])[] = [
    ["id", user.id],
    ["email", user.email],
    ["name", user.name],
    ["role", user.role],
    ["isDemo", user.isDemo],
    ["sampleDataSeeded", user.sampleDataSeeded],
    ["createdAt", user.createdAt],
    ["onboardedAt", user.onboardedAt],
    ["lastLoginAt", user.lastLoginAt],
    ["lastLoginIp", user.lastLoginIp],
  ];

  return (
    <dl className="admin-kv admin-kv--inline">
      {entries.map(([key, value]) => (
        <div key={key} className="admin-kv__pair">
          <dt>{key}</dt>
          <dd>{formatAdminValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AdminUserDetailScreen({
  userId,
  onAuthFailure,
  onBack,
}: AdminUserDetailScreenProps) {
  const summary = useAdminRequest(fetchAdminUser, onAuthFailure);
  const data = useAdminRequest(fetchAdminUserData, onAuthFailure);
  const { send: sendSummary } = summary;
  const { send: sendData } = data;

  const load = useCallback(() => {
    void sendSummary(userId);
    void sendData(userId);
  }, [sendSummary, sendData, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminSection
      title={`사용자 ${userId}`}
      description="서버 응답의 모든 키를 그대로 컬럼으로 세웁니다. 소유자 참조는 ownerId로만 표시합니다."
      action={
        <>
          <button type="button" className="admin-button" onClick={onBack}>
            목록으로
          </button>
          <button type="button" className="admin-button" onClick={load}>
            다시 불러오기
          </button>
        </>
      }
    >
      {summary.state.status === "error" && (
        <AdminErrorPanel error={summary.state.error} />
      )}
      {summary.state.status === "success" && (
        <AdminUserSummary user={summary.state.result.data} />
      )}

      {data.state.status === "loading" && (
        <AdminLoadingPanel label="사용자 데이터를 불러오는 중입니다." />
      )}
      {data.state.status === "error" && (
        <AdminErrorPanel error={data.state.error} />
      )}
      {data.state.status === "success" && (
        <>
          <AdminMetaLine meta={data.state.result.meta} />
          {Object.entries(data.state.result.data).map(([domain, rows]) => (
            <AdminDomainSection key={domain} domain={domain} rows={rows} />
          ))}
        </>
      )}
    </AdminSection>
  );
}
