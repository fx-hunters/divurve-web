/**
 * 관리자 콘솔의 상태·응답 표시 조각들.
 *
 * 모두 props만 받는 표현 컴포넌트다(AGENTS.md 7.2).
 */
import type { ReactNode } from "react";
import type { ApiMeta } from "../../api/client";
import type { AdminErrorInfo } from "./admin-errors";
import { formatAdminJson, formatAdminValue } from "./admin-value";

interface AdminSectionProps {
  readonly title: string;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}

export function AdminSection({
  title,
  description,
  action,
  children,
}: AdminSectionProps) {
  return (
    <section className="admin-section">
      <div className="admin-section__head">
        <div>
          <h2 className="admin-section__title">{title}</h2>
          {description && (
            <p className="admin-section__description">{description}</p>
          )}
        </div>
        {action && <div className="admin-section__action">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** 서버가 준 에러를 코드·필드까지 그대로 드러낸다. */
export function AdminErrorPanel({ error }: { readonly error: AdminErrorInfo }) {
  return (
    <div className="admin-panel admin-panel--danger" role="alert">
      <p className="admin-panel__message">{error.message}</p>
      <dl className="admin-kv">
        <dt>code</dt>
        <dd>{error.code}</dd>
        <dt>status</dt>
        <dd>{formatAdminValue(error.status)}</dd>
        <dt>field</dt>
        <dd>{formatAdminValue(error.field)}</dd>
      </dl>
    </div>
  );
}

export function AdminLoadingPanel({ label }: { readonly label: string }) {
  return (
    <p className="admin-panel" role="status" aria-live="polite">
      {label}
    </p>
  );
}

export function AdminIdlePanel({ label }: { readonly label: string }) {
  return <p className="admin-panel admin-panel--idle">{label}</p>;
}

/** 응답 봉투의 meta를 그대로 한 줄로 보여준다. */
export function AdminMetaLine({ meta }: { readonly meta: ApiMeta }) {
  const entries = Object.entries(meta as unknown as Record<string, unknown>);
  if (entries.length === 0) return null;
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

/**
 * 응답 원문 덤프.
 *
 * 갱신·외부 상태 응답은 형태가 확정되지 않아 골라 담으면 정보를 잃는다.
 * 서버가 돌려준 것을 그대로 남겨 둔다.
 */
export function AdminRawPanel({
  title,
  value,
}: {
  readonly title: string;
  readonly value: unknown;
}) {
  return (
    <details className="admin-raw" open>
      <summary>{title}</summary>
      <pre className="admin-raw__body">{formatAdminJson(value)}</pre>
    </details>
  );
}
