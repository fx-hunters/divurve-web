/**
 * 2-5(a). 자연어 설명 호출 결과.
 *
 * props만 받는 표현 컴포넌트다(AGENTS.md 7.2). 이 API는 검증에 걸려도 400이
 * 아니라 200 + `fallback: true` + 고정 템플릿을 돌려주므로, 어떤 검증에서
 * 걸렸는지(`verification`)를 결과의 맨 앞에 세운다.
 */
import type { ExplainResult } from "../../api/ai-explain";
import { getFallbackReasonLabel } from "./admin-ai-explain-copy";
import {
  AdminErrorPanel,
  AdminIdlePanel,
  AdminLoadingPanel,
  AdminMetaLine,
  AdminRawPanel,
} from "./admin-panels";
import { formatAdminValue } from "./admin-value";
import type { AdminRequestState } from "./use-admin-request";

interface AdminAiExplainResultProps {
  readonly state: AdminRequestState<ExplainResult>;
  /** facts를 JSON으로 읽지 못했을 때의 사유. 호출 전에 걸린 것이다. */
  readonly parseError: string | null;
}

export function AdminAiExplainResult({
  state,
  parseError,
}: AdminAiExplainResultProps) {
  if (parseError !== null) {
    return (
      <p className="admin-panel admin-panel--danger" role="alert">
        {parseError}
      </p>
    );
  }

  if (state.status === "idle") {
    return <AdminIdlePanel label="facts를 채우고 호출을 누르세요." />;
  }
  if (state.status === "loading") {
    return <AdminLoadingPanel label="설명을 생성하는 중입니다." />;
  }
  if (state.status === "error") {
    return <AdminErrorPanel error={state.error} />;
  }

  const { explanation, verification } = state.result.data;
  return (
    <>
      {explanation.fallback === true && (
        <p className="admin-panel admin-panel--warn" role="alert">
          fallback=true — LLM 결과가 검증을 통과하지 못해 고정 템플릿이
          나갔습니다.
          {verification.fallbackReason === null
            ? " 아래 verification을 확인하세요."
            : ` 사유: ${getFallbackReasonLabel(verification.fallbackReason)}`}
        </p>
      )}

      <h3 className="admin-subtitle">verification</h3>
      <dl className="admin-kv admin-kv--inline">
        <div className="admin-kv__pair">
          <dt>fallbackReason</dt>
          <dd>
            {verification.fallbackReason === null
              ? "-"
              : `${verification.fallbackReason} — ${getFallbackReasonLabel(verification.fallbackReason)}`}
          </dd>
        </div>
        <div className="admin-kv__pair">
          <dt>numericMatch</dt>
          <dd>{formatAdminValue(verification.numericMatch)}</dd>
        </div>
        <div className="admin-kv__pair">
          <dt>regimeDisclosed</dt>
          <dd>{formatAdminValue(verification.regimeDisclosed)}</dd>
        </div>
        <div className="admin-kv__pair">
          <dt>blockedPhrases</dt>
          <dd>
            {verification.blockedPhrases.length === 0
              ? "-"
              : verification.blockedPhrases.join(", ")}
          </dd>
        </div>
      </dl>
      {(verification.numericMatch === null ||
        verification.regimeDisclosed === null) && (
        <p className="admin-note">
          null은 &quot;검증 단계에 닿지 못했다&quot;는 뜻입니다. 통과했다는
          뜻이 아닙니다.
        </p>
      )}

      <h3 className="admin-subtitle">explanation</h3>
      <dl className="admin-kv admin-kv--inline">
        <div className="admin-kv__pair">
          <dt>sentenceCount</dt>
          <dd>{formatAdminValue(explanation.sentenceCount)}</dd>
        </div>
        <div className="admin-kv__pair">
          <dt>explainLevel</dt>
          <dd>{formatAdminValue(explanation.explainLevel)}</dd>
        </div>
        <div className="admin-kv__pair">
          <dt>explainDomain</dt>
          <dd>{formatAdminValue(explanation.explainDomain)}</dd>
        </div>
        <div className="admin-kv__pair">
          <dt>fallback</dt>
          <dd>{formatAdminValue(explanation.fallback)}</dd>
        </div>
      </dl>

      {explanation.sentences.length === 0 ? (
        <p className="admin-empty">문장이 없습니다.</p>
      ) : (
        <ol className="admin-sentences">
          {explanation.sentences.map((sentence, index) => (
            <li key={`${index}-${sentence}`}>{sentence}</li>
          ))}
        </ol>
      )}

      <AdminMetaLine meta={state.result.meta} />
      <AdminRawPanel title="응답 원문" value={state.result} />
    </>
  );
}
