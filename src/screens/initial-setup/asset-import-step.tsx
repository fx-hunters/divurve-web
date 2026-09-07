import { Badge } from "../../components/common/badge";
import { Icon } from "../../components/common/icon";
import { toAsOfLabel, toAssetSummaryRows } from "./asset-import-presenter";
import type { AssetImportState } from "./initial-setup-types";
import type { ImportedAssetSummary } from "../../types/assets";

interface AssetImportStepProps {
  readonly state: AssetImportState;
  readonly onRetry: () => Promise<void>;
}

function AssetSummaryResult({ summary }: { readonly summary: ImportedAssetSummary }) {
  const asOfLabel = toAsOfLabel(summary.asOf);
  return (
    <div className="initial-setup__import-result" role="status">
      <div className="initial-setup__result-heading">
        <div>
          <span className="initial-setup__success-icon" aria-hidden="true">
            <Icon name="check" size={18} />
          </span>
          <strong>자산을 확인했어요</strong>
        </div>
        {/*
          MVP 동안은 데모 계정과 가입 계정 모두 같은 체험용 자산을 받는다.
          `meta.is_demo`는 둘러보기 계정에서만 true라 판정 기준이 될 수 없어
          실연동이 도착할 때까지 배지를 항상 표시한다.
        */}
        <Badge variant="warn">체험용 데이터</Badge>
      </div>
      <dl className="initial-setup__asset-summary">
        {toAssetSummaryRows(summary).map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <p>{asOfLabel === null ? "체험용 자산 데이터" : `체험용 자산 데이터 · ${asOfLabel}`}</p>
    </div>
  );
}

export function AssetImportStep({ state, onRetry }: AssetImportStepProps) {
  return (
    <section aria-labelledby="asset-import-title">
      <p className="initial-setup__eyebrow">자산 기준 준비</p>
      <h2 className="initial-setup__step-title" id="asset-import-title">
        지금 보유한 자산이에요
      </h2>
      <p className="initial-setup__step-description">
        이 자산을 기준으로 외화 노출과 이후 계획 화면을 구성합니다. 지금은 실제
        금융기관 대신 계정에 채워진 체험용 자산을 조회해 보여줍니다.
      </p>

      {(state.status === "idle" || state.status === "loading") && (
        <div className="initial-setup__import-loading" role="status">
          <div className="initial-setup__connection-curve" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <strong>보유 자산을 확인하고 있어요</strong>
          <span>계정에 등록된 자산을 조회하는 중입니다.</span>
        </div>
      )}

      {state.status === "success" && <AssetSummaryResult summary={state.data} />}

      {state.status === "error" && (
        <div className="initial-setup__import-error" role="alert">
          <Icon name="alertCircle" size={22} />
          <div>
            <strong>자산을 확인하지 못했어요</strong>
            <span>{state.message}</span>
          </div>
          <button
            className="initial-setup__button initial-setup__button--secondary"
            type="button"
            onClick={() => void onRetry()}
          >
            다시 시도
          </button>
        </div>
      )}
    </section>
  );
}
