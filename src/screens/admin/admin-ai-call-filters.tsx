/**
 * AI 호출 로그 조회 조건 폼.
 *
 * props만 받는 표현 컴포넌트다(AGENTS.md 7.2). 값을 보정하지 않고 입력한
 * 그대로 위로 올린다 — 어휘 오타나 뒤집힌 기간을 서버가 400으로 거절하는
 * 것을 화면에서 확인할 수 있어야 한다.
 */
import { ADMIN_AI_OUTCOMES, ADMIN_AI_PURPOSES } from "../../api/admin";
import {
  toAdminAiOutcomeLabel,
  toAdminAiPurposeLabel,
} from "./admin-ai-call-vocabulary";
import type { AdminDemoFilter } from "./admin-demo-filter";
import type { AdminAiCallFilterValues } from "./admin-ai-call-query";

interface AdminAiCallFiltersProps {
  readonly values: AdminAiCallFilterValues;
  readonly onChange: (next: AdminAiCallFilterValues) => void;
  readonly onSubmit: () => void;
}

export function AdminAiCallFilters({
  values,
  onChange,
  onSubmit,
}: AdminAiCallFiltersProps) {
  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="admin-toolbar" onSubmit={handleSubmit}>
      <label className="admin-field">
        <span>from (UTC 기준 날짜)</span>
        <input
          type="date"
          value={values.from}
          onChange={(event) =>
            onChange({ ...values, from: event.target.value })
          }
        />
      </label>
      <label className="admin-field">
        <span>to (UTC 기준 날짜)</span>
        <input
          type="date"
          value={values.to}
          onChange={(event) => onChange({ ...values, to: event.target.value })}
        />
      </label>
      <label className="admin-field">
        <span>용도 (purpose)</span>
        <select
          value={values.purpose}
          onChange={(event) =>
            onChange({ ...values, purpose: event.target.value })
          }
        >
          <option value="">전체 (보내지 않음)</option>
          {ADMIN_AI_PURPOSES.map((purpose) => (
            <option key={purpose} value={purpose}>
              {toAdminAiPurposeLabel(purpose)}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-field">
        <span>결과 (outcome)</span>
        <select
          value={values.outcome}
          onChange={(event) =>
            onChange({ ...values, outcome: event.target.value })
          }
        >
          <option value="">전체 (보내지 않음)</option>
          {ADMIN_AI_OUTCOMES.map((outcome) => (
            <option key={outcome} value={outcome}>
              {toAdminAiOutcomeLabel(outcome)}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-field">
        <span>화면 (surface)</span>
        <input
          type="search"
          value={values.surface}
          placeholder="forecast_summary"
          onChange={(event) =>
            onChange({ ...values, surface: event.target.value })
          }
        />
      </label>
      <label className="admin-field">
        <span>데모 트래픽 (is_demo)</span>
        <select
          value={values.demo}
          onChange={(event) =>
            onChange({
              ...values,
              demo: event.target.value as AdminDemoFilter,
            })
          }
        >
          <option value="all">전체 (보내지 않음)</option>
          <option value="demoOnly">데모만 (true)</option>
          <option value="memberOnly">데모 제외 (false)</option>
        </select>
      </label>
      <button type="submit" className="admin-button admin-button--primary">
        조회
      </button>
    </form>
  );
}
