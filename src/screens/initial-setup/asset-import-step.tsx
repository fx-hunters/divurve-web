import {
  DataSourceBadge,
  getDataSourceCopy,
  toApiDataSourceKind,
} from "../../components/common/data-source-badge";
import { Icon } from "../../components/common/icon";
import {
  toAsOfLabel,
  toAssetSummaryRows,
  toImportedAssetGroups,
} from "./asset-import-presenter";
import type { AssetImportState } from "./initial-setup-types";
import type { ImportedAssetSummary } from "../../types/assets";

interface AssetImportStepProps {
  readonly state: AssetImportState;
  readonly onImport: () => Promise<void>;
}

function AssetSummaryResult({ summary }: { readonly summary: ImportedAssetSummary }) {
  const asOfLabel = toAsOfLabel(summary.asOf);
  const sourceKind = toApiDataSourceKind(summary.isSampleData);
  const sourceCopy = getDataSourceCopy(sourceKind);
  const groups = toImportedAssetGroups(summary);
  return (
    <div className="initial-setup__import-result" role="status">
      <div className="initial-setup__result-heading">
        <div>
          <span className="initial-setup__success-icon" aria-hidden="true">
            <Icon name="check" size={18} />
          </span>
          <strong>자산을 확인했어요</strong>
        </div>
        <DataSourceBadge kind={sourceKind} />
      </div>
      <dl className="initial-setup__asset-summary">
        {toAssetSummaryRows(summary).map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {groups.length > 0 && (
        <div className="initial-setup__imported-groups" aria-label="불러온 자산 항목">
          {groups.map((group) => (
            <div key={group.label}>
              <strong>{group.label}</strong>
              <ul>
                {group.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      <p>{asOfLabel === null ? sourceCopy.description : `${sourceCopy.description} · ${asOfLabel}`}</p>
    </div>
  );
}

export function AssetImportStep({ state, onImport }: AssetImportStepProps) {
  return (
    <section aria-labelledby="asset-import-title">
      <p className="initial-setup__eyebrow">자산 기준 준비</p>
      <h2 className="initial-setup__step-title" id="asset-import-title">
        보유 자산을 불러올까요?
      </h2>
      <p className="initial-setup__step-description">
        현재 계정에 등록된 자산을 조회해 외화 노출과 이후 계획 화면에서 같은
        기준으로 사용합니다. 조회만 하며 자산을 새로 만들거나 저장하지 않습니다.
      </p>

      {state.status === "idle" && (
        <div className="initial-setup__import-idle">
          <Icon name="database" size={24} />
          <strong>계정에 등록된 자산을 확인할 준비가 됐어요</strong>
          <span>금융기관 연결을 새로 만드는 단계가 아니라, 현재 서버 데이터를 조회합니다.</span>
          <button
            className="initial-setup__button initial-setup__button--primary"
            type="button"
            onClick={() => void onImport()}
          >
            자산 불러오기
          </button>
        </div>
      )}

      {state.status === "loading" && (
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

      {state.status === "empty" && (
        <div className="initial-setup__import-empty" role="status">
          <Icon name="database" size={22} />
          <div>
            <strong>불러올 자산이 없습니다</strong>
            <span>현재 계정에 등록된 자산이 없어도 다음 단계로 이동할 수 있습니다.</span>
          </div>
          <DataSourceBadge kind={toApiDataSourceKind(state.data.isSampleData)} />
        </div>
      )}

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
            onClick={() => void onImport()}
          >
            다시 시도
          </button>
        </div>
      )}
    </section>
  );
}
