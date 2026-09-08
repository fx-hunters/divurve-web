/**
 * 2-5(a). 자연어 설명 테스트.
 *
 * 이 API는 검증에 걸려도 400이 아니라 200 + `fallback: true` + 고정 템플릿을
 * 돌려준다. 그래서 HTTP 상태로 성공을 판정하지 않고 `fallback`과
 * `verification`을 함께 본다 — 어떤 검증에서 걸렸는지가 이 화면의 핵심이다.
 *
 * `explain_level`·`explain_domain`은 요청이 아니라 로그인 사용자 설정에서
 * 오므로 입력란을 두지 않는다.
 *
 * 배치: 입력을 왼쪽, 결과를 오른쪽에 1:1로 세운다. facts JSON을 고치면서 그
 * 결과를 곧바로 대조하는 것이 이 화면을 쓰는 방식이기 때문이다.
 */
import { useState } from "react";
import { requestExplanation } from "../../api/ai-explain";
import { AdminAiExplainResult } from "./admin-ai-explain-result";
import type { AdminAuthFailure } from "./admin-errors";
import { AdminSection } from "./admin-panels";
import { useAdminRequest } from "./use-admin-request";

const DEFAULT_SURFACE = "forecast_summary";

const DEFAULT_FACTS = `{
  "pair_code": "USDKRW",
  "current_rate": 1382.4,
  "interval_80": { "lo": 1346.0, "hi": 1431.0 },
  "vol_percentile_5y": 0.72,
  "per_1pct_krw": 157900,
  "regime": "elevated"
}`;

export type FactsParseResult =
  | { readonly status: "ok"; readonly facts: unknown }
  | { readonly status: "error"; readonly message: string };

/** facts 편집기의 입력을 JSON으로 읽는다. 실패 사유를 그대로 돌려준다. */
export function parseFactsInput(text: string): FactsParseResult {
  try {
    return { status: "ok", facts: JSON.parse(text) };
  } catch (error) {
    // JSON.parse가 던지는 SyntaxError를 그대로 문자열로 보여준다.
    // 어디서 끊겼는지가 편집기에서 바로 필요한 정보다.
    return {
      status: "error",
      message: `facts를 JSON으로 읽지 못했습니다: ${String(error)}`,
    };
  }
}

interface AdminAiExplainScreenProps {
  readonly onAuthFailure: (failure: AdminAuthFailure) => void;
}

export function AdminAiExplainScreen({
  onAuthFailure,
}: AdminAiExplainScreenProps) {
  const [surface, setSurface] = useState(DEFAULT_SURFACE);
  const [factsInput, setFactsInput] = useState(DEFAULT_FACTS);
  const [parseError, setParseError] = useState<string | null>(null);
  const { state, send } = useAdminRequest(requestExplanation, onAuthFailure);

  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const parsed = parseFactsInput(factsInput);
    if (parsed.status === "error") {
      setParseError(parsed.message);
      return;
    }
    setParseError(null);
    void send({ surface, facts: parsed.facts });
  };

  return (
    <div className="admin-split">
      <AdminSection
        title="입력"
        description="POST /api/v1/ai/explain — 실패해도 200이 옵니다. fallback과 verification으로 판정하세요."
      >
        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="admin-field">
            <span>surface</span>
            <input
              type="text"
              value={surface}
              onChange={(event) => setSurface(event.target.value)}
            />
          </label>
          <label className="admin-field admin-field--block">
            <span>facts (JSON)</span>
            <textarea
              value={factsInput}
              rows={14}
              spellCheck={false}
              onChange={(event) => setFactsInput(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="admin-button admin-button--primary"
            disabled={state.status === "loading"}
          >
            호출
          </button>
        </form>
      </AdminSection>

      <AdminSection title="결과">
        <AdminAiExplainResult state={state} parseError={parseError} />
      </AdminSection>
    </div>
  );
}
