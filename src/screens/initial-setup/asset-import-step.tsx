import { Badge } from "../../components/common/badge";
import { Icon } from "../../components/common/icon";
import type { AssetImportState } from "./initial-setup-types";

interface AssetImportStepProps {
  readonly state: AssetImportState;
  readonly onImport: () => Promise<void>;
}

export function AssetImportStep({ state, onImport }: AssetImportStepProps) {
  return (
    <section aria-labelledby="asset-import-title">
      <p className="initial-setup__eyebrow">자산 기준 준비</p>
      <h2 className="initial-setup__step-title" id="asset-import-title">
        보유 자산을 불러올까요?
      </h2>
      <p className="initial-setup__step-description">
        불러온 자산을 기준으로 외화 노출과 이후 계획 화면을 구성합니다. 지금은
        실제 금융기관 대신 체험용 데이터를 사용해요.
      </p>

      {state.status === "idle" && (
        <div className="initial-setup__import-ready">
          <Icon name="database" size={34} />
          <div>
            <strong>체험용 자산으로 연결 흐름 확인</strong>
            <span>실제 계좌나 금융기관에는 연결하지 않습니다.</span>
          </div>
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
          <strong>체험용 자산을 불러오고 있어요</strong>
          <span>계좌 연결을 시뮬레이션하고 있습니다.</span>
        </div>
      )}

      {state.status === "success" && (
        <div className="initial-setup__import-result" role="status">
          <div className="initial-setup__result-heading">
            <div>
              <span className="initial-setup__success-icon" aria-hidden="true">
                <Icon name="check" size={18} />
              </span>
              <strong>자산을 불러왔어요</strong>
            </div>
            <Badge variant="warn">체험용 데이터</Badge>
          </div>
          <dl className="initial-setup__asset-summary">
            <div>
              <dt>{state.data.foreignAssetLabel}</dt>
              <dd>{state.data.foreignAssetValue}</dd>
            </div>
            <div>
              <dt>{state.data.krwAssetLabel}</dt>
              <dd>{state.data.krwAssetValue}</dd>
            </div>
            <div>
              <dt>확인 통화</dt>
              <dd>{state.data.currenciesLabel}</dd>
            </div>
          </dl>
          <p>{state.data.sourceLabel} · {state.data.importedAtLabel}</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="initial-setup__import-error" role="alert">
          <Icon name="alertCircle" size={22} />
          <div>
            <strong>자산을 불러오지 못했어요</strong>
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
