import { useXRay, type XRayDependencies } from "./use-xray";
import { XRayExposureView } from "./xray-exposure-view";
import { XRayFitnessView } from "./xray-fitness-view";
import { ApiStateView } from "../../components/common/api-state-view";
import {
  DataSourceBadge,
  getDataSourceCopy,
  toApiDataSourceKind,
} from "../../components/common/data-source-badge";
import type { ExplanationRequester } from "../../hooks/use-ai-explanation";
import type { NavTabId } from "../../types/navigation";

interface XRayScreenProps {
  readonly onNavigate?: (tab: NavTabId) => void;
  readonly dependencies?: XRayDependencies;
  /** AI 설명 요청 경로 주입 지점. 두 탭 뷰로 그대로 내려보낸다. */
  readonly explanationRequester?: ExplanationRequester;
}

export function XRayScreen({
  onNavigate,
  dependencies,
  explanationRequester,
}: XRayScreenProps) {
  const {
    activeTab,
    data,
    state,
    selectedScenarioCode,
    runState,
    runResult,
    previewState,
    setActiveTab,
    selectScenario,
    previewAdjustment,
    reload,
  } = useXRay(dependencies);

  const handleNavigateToPlanner = () => {
    if (onNavigate) {
      onNavigate("planner");
    }
  };

  if (state.status === "error") {
    return (
      <ApiStateView
        status="error"
        title="내 자산을 불러오지 못했습니다"
        message={state.message}
        onRetry={reload}
      />
    );
  }
  /*
   * 로딩과 '자산 없음'은 둘 다 data 가 null 이라 상태로 갈라야 한다. 응답을
   * 받고도 비어 있을 때만 빈 화면을 내고, 기다리는 중에는 화면을 그대로 둔다.
   */
  const isLoading = state.status === "loading";
  if (!isLoading && data === null) {
    return (
      <ApiStateView
        status="empty"
        title="등록된 자산이 없습니다"
        message="보유 종목과 외화 예금을 등록하면 통화 노출과 손익 분해를 볼 수 있습니다."
      />
    );
  }

  /* 응답 전에는 출처를 모른다. 'unknown' 이 그 상태의 기본 문구를 준다. */
  const dataSourceKind = toApiDataSourceKind(data?.isSampleData);
  const dataSourceCopy = getDataSourceCopy(dataSourceKind);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div role="status" aria-label="자산 데이터 출처">
        <DataSourceBadge kind={dataSourceKind} />
        <span className="sr-only">{dataSourceCopy.description}</span>
      </div>
      {/*
        값 자리가 비어 있는 동안 상태를 한 번만 읽어 준다. 자리표시자 막대는
        전부 aria-hidden 이라 여기 말고는 읽힐 것이 없다.
      */}
      {isLoading && (
        <span className="sr-only" role="status">
          내 자산을 불러오는 중입니다. 통화 노출과 손익 분해를 함께 확인하고
          있습니다.
        </span>
      )}
      {/* 상단 서브 탭 네비게이션 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "1px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("exposure")}
          style={{
            padding: "0.75rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            borderBottom: activeTab === "exposure" ? "2px solid var(--primary)" : "2px solid transparent",
            color: activeTab === "exposure" ? "var(--text)" : "var(--text-muted)",
            transition: "all 0.15s ease",
          }}
        >
          통화 노출 · 손익 분해
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fitness")}
          style={{
            padding: "0.75rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            borderBottom: activeTab === "fitness" ? "2px solid var(--primary)" : "2px solid transparent",
            color: activeTab === "fitness" ? "var(--text)" : "var(--text-muted)",
            transition: "all 0.15s ease",
          }}
        >
          통화 적합도
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "exposure" ? (
        <XRayExposureView
          data={data}
          selectedScenarioCode={selectedScenarioCode}
          runState={runState}
          runResult={runResult}
          onSelectScenario={selectScenario}
          explanationRequester={explanationRequester}
        />
      ) : (
        <XRayFitnessView
          data={data}
          previewState={previewState}
          onPreviewAdjustment={previewAdjustment}
          onNavigateToPlanner={handleNavigateToPlanner}
          explanationRequester={explanationRequester}
        />
      )}
    </div>
  );
}
