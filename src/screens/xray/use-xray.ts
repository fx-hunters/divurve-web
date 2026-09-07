import { useCallback, useMemo, useState } from "react";
import { DEMO_XRAY_DATA } from "../../api/fixtures/xray-dashboard";
import type {
  StressScenarioItem,
  XRayDashboardData,
  XRayTabId,
} from "../../types/xray";

export { DEMO_XRAY_DATA } from "../../api/fixtures/xray-dashboard";

export function useXRay() {
  const [activeTab, setActiveTab] = useState<XRayTabId>("exposure");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("2008");
  const [eurSimulationPct, setEurSimulationPctState] = useState<number>(10);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);

  const data: XRayDashboardData = useMemo(() => DEMO_XRAY_DATA, []);

  const activeScenario: StressScenarioItem = useMemo(() => {
    return (
      data.scenarios.find((scenario) => scenario.id === selectedScenarioId) ??
      data.scenarios[0]
    );
  }, [data.scenarios, selectedScenarioId]);

  const handleSetEurSimulationPct = useCallback((value: number) => {
    setEurSimulationPctState(Math.max(0, Math.min(50, value)));
  }, []);

  const handleOpenAssetModal = useCallback(() => {
    setIsAssetModalOpen(true);
  }, []);

  const handleCloseAssetModal = useCallback(() => {
    setIsAssetModalOpen(false);
  }, []);

  return {
    data,
    activeTab,
    selectedScenarioId,
    activeScenario,
    eurSimulationPct,
    isAssetModalOpen,
    setActiveTab,
    setSelectedScenarioId,
    setEurSimulationPct: handleSetEurSimulationPct,
    openAssetModal: handleOpenAssetModal,
    closeAssetModal: handleCloseAssetModal,
  };
}
