/**
 * 2-5(b). 비정형 데이터 정형화 미리보기.
 *
 * 저장되지 않는 미리보기다. 이 화면의 주된 산출물은 `valid=false` 행의
 * `reject_reason`이므로 붉게 강조한다.
 */
import { useState } from "react";
import {
  ADMIN_EXTRACT_TEXT_MAX_LENGTH,
  NOOP_EXTRACTOR,
  previewAdminExtraction,
  type AdminExtractCandidate,
} from "../../api/admin";
import type { AdminAuthFailure } from "./admin-errors";
import {
  AdminErrorPanel,
  AdminIdlePanel,
  AdminLoadingPanel,
  AdminMetaLine,
  AdminRawPanel,
  AdminSection,
} from "./admin-panels";
import { AdminTable, type AdminColumn } from "./admin-table";
import { formatAdminDateTime } from "./admin-datetime";
import { formatAdminValue } from "./admin-value";
import { useAdminRequest } from "./use-admin-request";

const CANDIDATE_COLUMNS: readonly AdminColumn<AdminExtractCandidate>[] = [
  { key: "eventDate" },
  { key: "region" },
  { key: "title" },
  { key: "impact" },
  { key: "valid" },
  {
    key: "rejectReason",
    render: (candidate) =>
      candidate.valid === false ? (
        <strong className="admin-reject-reason">
          {formatAdminValue(candidate.rejectReason)}
        </strong>
      ) : (
        formatAdminValue(candidate.rejectReason)
      ),
  },
];

interface AdminAiExtractScreenProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}

export function AdminAiExtractScreen({
  onAuthFailure,
}: AdminAiExtractScreenProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [text, setText] = useState("");
  const { state, send } = useAdminRequest(previewAdminExtraction, onAuthFailure);

  // URL이든 원문이든 하나만 있으면 보낼 수 있다.
  const hasExtractInput = sourceUrl.trim() !== "" || text.trim() !== "";

  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    void send({ sourceUrl, text });
  };

  return (
    <AdminSection
      title="AI 비정형 데이터 정형화"
      description="POST /api/v1/admin/ai/extract-preview — 저장되지 않는 미리보기입니다. eventDate·region·impact는 검증 전 원시값이라 형식이 어긋난 값도 그대로 나옵니다."
    >
      <p className="admin-panel admin-panel--idle">
        이 화면의 결과는 저장되지 않습니다. 추출 결과를 확인만 합니다.
      </p>

      <form className="admin-form" onSubmit={handleSubmit}>
        <label className="admin-field">
          <span>source_url — URL만 넣으면 서버가 본문을 수집해 추출합니다</span>
          <input
            type="text"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://..."
          />
        </label>
        <label className="admin-field admin-field--block">
          <span>
            text — 원문을 직접 붙여넣을 때만. 함께 넣으면 text가 우선합니다 (
            {text.length}/{ADMIN_EXTRACT_TEXT_MAX_LENGTH}자)
          </span>
          <textarea
            value={text}
            rows={16}
            spellCheck={false}
            maxLength={ADMIN_EXTRACT_TEXT_MAX_LENGTH}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="admin-button admin-button--primary"
          disabled={state.status === "loading" || !hasExtractInput}
        >
          추출 미리보기
        </button>
      </form>

      {state.status === "idle" && (
        <AdminIdlePanel label="뉴스 URL을 넣거나 원문을 붙여 넣고 추출 미리보기를 누르세요." />
      )}
      {state.status === "loading" && (
        <AdminLoadingPanel label="추출 결과를 기다리는 중입니다." />
      )}
      {state.status === "error" && <AdminErrorPanel error={state.error} />}
      {state.status === "success" && (
        <>
          {state.result.data.extractor === NOOP_EXTRACTOR && (
            <p className="admin-panel admin-panel--warn" role="alert">
              추출기가 꺼져 있습니다(ANTHROPIC_EXTRACT_ENABLED=false). 이때
              count=0은 정상입니다.
            </p>
          )}

          <dl className="admin-kv admin-kv--inline">
            <div className="admin-kv__pair">
              <dt>extractor</dt>
              <dd>{formatAdminValue(state.result.data.extractor)}</dd>
            </div>
            <div className="admin-kv__pair">
              <dt>count</dt>
              <dd>{formatAdminValue(state.result.data.count)}</dd>
            </div>
            <div className="admin-kv__pair">
              <dt>previewedAt</dt>
              <dd>{formatAdminDateTime(state.result.data.previewedAt)}</dd>
            </div>
            <div className="admin-kv__pair">
              <dt>resolvedSourceUrl</dt>
              <dd>{formatAdminValue(state.result.data.resolvedSourceUrl)}</dd>
            </div>
            <div className="admin-kv__pair">
              <dt>fetchedCharCount</dt>
              <dd>{formatAdminValue(state.result.data.fetchedCharCount)}</dd>
            </div>
          </dl>

          {state.result.data.failureReason !== null && (
            <p className="admin-panel admin-panel--danger" role="alert">
              {state.result.data.failureReason}
            </p>
          )}

          {state.result.data.fetchedTextPreview !== null && (
            <AdminRawPanel
              title="서버가 수집한 본문 (앞부분)"
              value={state.result.data.fetchedTextPreview}
            />
          )}

          <AdminTable
            columns={CANDIDATE_COLUMNS}
            rows={state.result.data.candidates}
            getRowKey={(candidate, index) => `${candidate.title}-${index}`}
            getRowTone={(candidate) =>
              candidate.valid === false ? "danger" : "default"
            }
            emptyLabel="후보가 없습니다."
          />

          <AdminMetaLine meta={state.result.meta} />
          <AdminRawPanel title="응답 원문" value={state.result} />
        </>
      )}
    </AdminSection>
  );
}
