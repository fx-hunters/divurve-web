/**
 * 2-1. 사용자 목록.
 *
 * 표시하는 값은 모두 서버 응답에서 온다. 합계·비율을 여기서 만들지 않는다.
 * `email`이 곧 로그인 식별자다 — "아이디" 열을 따로 만들지 않는다.
 */
import { useCallback, useEffect, useState } from "react";
import { fetchAdminUsers, type AdminUser } from "../../api/admin";
import { formatAdminDateTime } from "./admin-datetime";
import { toIsDemoParam, type AdminDemoFilter } from "./admin-demo-filter";
import type { AdminAuthFailure } from "./admin-errors";
import { hasAdminNextPage } from "./admin-paging";
import {
  AdminErrorPanel,
  AdminLoadingPanel,
  AdminMetaLine,
  AdminSection,
} from "./admin-panels";
import { AdminTable, type AdminColumn } from "./admin-table";
import { formatAdminValue } from "./admin-value";
import { useAdminRequest } from "./use-admin-request";

export const ADMIN_USERS_PAGE_SIZE = 50;

/**
 * 표에 세울 컬럼과 그 순서.
 *
 * 응답에는 `id`·`role`·`sampleDataSeeded`·`onboardedAt`도 오지만 목록에서는
 * 세우지 않는다. 계정을 찾아 들어가는 데 쓰는 값만 남긴 것이고, 나머지는
 * 행을 눌러 들어가는 상세 화면에서 본다. `id`는 컬럼에서 빠져도 행 클릭이
 * 행 객체의 `user.id`를 그대로 쓰므로 이동에는 영향이 없다.
 */
const COLUMNS: readonly AdminColumn<AdminUser>[] = [
  { key: "lastLoginIp" },
  { key: "lastLoginAt", render: (user) => formatAdminDateTime(user.lastLoginAt) },
  { key: "createdAt", render: (user) => formatAdminDateTime(user.createdAt) },
  {
    key: "isDemo",
    render: (user) =>
      user.isDemo === true ? (
        <span className="admin-badge admin-badge--demo">demo</span>
      ) : (
        formatAdminValue(user.isDemo)
      ),
  },
  { key: "name" },
  { key: "email" },
];

interface AdminUsersScreenProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
  readonly onSelectUser: (userId: string) => void;
}

export function AdminUsersScreen({
  onAuthFailure,
  onSelectUser,
}: AdminUsersScreenProps) {
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [demoFilter, setDemoFilter] = useState<AdminDemoFilter>("all");
  const { state, send } = useAdminRequest(fetchAdminUsers, onAuthFailure);

  const load = useCallback(() => {
    void send({
      page,
      size: ADMIN_USERS_PAGE_SIZE,
      q: appliedSearch,
      isDemo: toIsDemoParam(demoFilter),
    });
  }, [send, page, appliedSearch, demoFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setPage(0);
    setAppliedSearch(searchInput.trim());
  };

  const handleChangeDemoFilter = (next: AdminDemoFilter) => {
    setPage(0);
    setDemoFilter(next);
  };

  const listing = state.status === "success" ? state.result.data : null;

  return (
    <AdminSection
      title="사용자"
      description="행을 누르면 그 계정의 도메인 데이터로 이동합니다. lastLoginAt·lastLoginIp는 마지막 접속 1건이며 접속 이력이 아닙니다."
      action={
        <button type="button" className="admin-button" onClick={load}>
          다시 불러오기
        </button>
      }
    >
      <form className="admin-toolbar" onSubmit={handleSearch}>
        <label className="admin-field">
          <span>이메일·이름 검색 (q)</span>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="검색어"
          />
        </label>
        <button type="submit" className="admin-button">
          검색
        </button>
        <label className="admin-field">
          <span>데모 계정 (is_demo)</span>
          <select
            value={demoFilter}
            onChange={(event) =>
              handleChangeDemoFilter(event.target.value as AdminDemoFilter)
            }
          >
            <option value="all">전체 (보내지 않음)</option>
            <option value="demoOnly">데모만 (true)</option>
            <option value="memberOnly">데모 제외 (false)</option>
          </select>
        </label>
      </form>

      {state.status === "loading" && (
        <AdminLoadingPanel label="사용자 목록을 불러오는 중입니다." />
      )}
      {state.status === "error" && <AdminErrorPanel error={state.error} />}

      {state.status === "success" && listing !== null && (
        <>
          <AdminMetaLine meta={state.result.meta} />
          <dl className="admin-kv admin-kv--inline">
            <div className="admin-kv__pair">
              <dt>page</dt>
              <dd>{formatAdminValue(listing.page)}</dd>
            </div>
            <div className="admin-kv__pair">
              <dt>size</dt>
              <dd>{formatAdminValue(listing.size)}</dd>
            </div>
            <div className="admin-kv__pair">
              <dt>totalElements</dt>
              <dd>{formatAdminValue(listing.totalElements)}</dd>
            </div>
            <div className="admin-kv__pair">
              <dt>totalPages</dt>
              <dd>{formatAdminValue(listing.totalPages)}</dd>
            </div>
          </dl>

          <AdminTable
            columns={COLUMNS}
            rows={listing.items}
            getRowKey={(user, index) => `${formatAdminValue(user.id)}-${index}`}
            getRowTone={(user) => (user.isDemo === true ? "muted" : "default")}
            onSelectRow={(user) => {
              if (user.id !== null) onSelectUser(user.id);
            }}
            emptyLabel="조회된 사용자가 없습니다."
          />

          <div className="admin-pager">
            <button
              type="button"
              className="admin-button"
              disabled={page === 0}
              onClick={() => setPage((previous) => previous - 1)}
            >
              이전
            </button>
            <span className="admin-pager__label">요청한 page: {page}</span>
            <button
              type="button"
              className="admin-button"
              disabled={
                !hasAdminNextPage(listing, page, ADMIN_USERS_PAGE_SIZE)
              }
              onClick={() => setPage((previous) => previous + 1)}
            >
              다음
            </button>
          </div>
        </>
      )}
    </AdminSection>
  );
}
