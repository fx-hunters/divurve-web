import { useXRay, type XRayDependencies } from "./use-xray";
import { XRayExposureView } from "./xray-exposure-view";
import { XRayFitnessView } from "./xray-fitness-view";
import { ApiStateView } from "../../components/common/api-state-view";
import type { NavTabId } from "../../types/navigation";

interface XRayScreenProps {
  readonly onNavigate?: (tab: NavTabId) => void;
  readonly dependencies?: XRayDependencies;
}

export function XRayScreen({ onNavigate, dependencies }: XRayScreenProps) {
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

  if (state.status === "loading") {
    return (
      <ApiStateView
        status="loading"
        title="내 자산을 불러오는 중입니다"
        message="통화 노출과 손익 분해를 함께 확인하고 있습니다."
      />
    );
  }
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
  if (data === null) {
    return (
      <ApiStateView
        status="empty"
        title="등록된 자산이 없습니다"
        message="보유 종목과 외화 예금을 등록하면 통화 노출과 손익 분해를 볼 수 있습니다."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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
        />
      ) : (
        <XRayFitnessView
          data={data}
          previewState={previewState}
          onPreviewAdjustment={previewAdjustment}
          onNavigateToPlanner={handleNavigateToPlanner}
        />
      )}
    </div>
  );
}
