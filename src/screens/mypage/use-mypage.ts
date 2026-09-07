import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import type {
  MyPageBundle,
  SettingsUpdateRequest,
} from "../../api/generated/divurve-api";
import { fetchMyPageBundle, updateSettings } from "../../api/mypage";
import type { MyPageViewData } from "../../types/mypage";
import { toMyPageViewData, toSettingsView } from "./mypage-presenter";

export type MyPageState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "success"; readonly data: MyPageViewData };

export type SettingsSaveState =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "saved" };

export interface MyPageDependencies {
  readonly load: () => Promise<MyPageBundle>;
  readonly saveSettings: typeof updateSettings;
}

const DEFAULT_DEPENDENCIES: MyPageDependencies = {
  load: fetchMyPageBundle,
  saveSettings: updateSettings,
};

function toErrorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "마이페이지 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";
}

interface UseMyPageResult {
  readonly state: MyPageState;
  readonly saveState: SettingsSaveState;
  readonly reload: () => void;
  readonly saveSettings: (input: SettingsUpdateRequest) => void;
}

export function useMyPage(
  dependencies: MyPageDependencies = DEFAULT_DEPENDENCIES,
): UseMyPageResult {
  const [state, setState] = useState<MyPageState>({ status: "loading" });
  const [saveState, setSaveState] = useState<SettingsSaveState>({
    status: "idle",
  });
  const [reloadKey, setReloadKey] = useState(0);

  // 호출자가 의존성 객체를 인라인으로 만들어 넘겨도 조회가 반복되지 않도록
  // ref로 최신 값만 참조한다. 의존성 교체는 재조회 신호가 아니다.
  const dependenciesRef = useRef(dependencies);
  dependenciesRef.current = dependencies;

  useEffect(() => {
    let isActive = true;
    setState({ status: "loading" });

    void dependenciesRef.current
      .load()
      .then((bundle) => {
        if (isActive) {
          setState({ status: "success", data: toMyPageViewData(bundle) });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setState({ status: "error", message: toErrorMessage(error) });
        }
      });

    return () => {
      isActive = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((currentKey) => currentKey + 1);
  }, []);

  const saveSettings = useCallback((input: SettingsUpdateRequest) => {
    setSaveState({ status: "saving" });
    void dependenciesRef.current
      .saveSettings(input)
      .then((settings) => {
        setState((current) =>
          current.status === "success"
            ? {
                status: "success",
                data: { ...current.data, settings: toSettingsView(settings) },
              }
            : current,
        );
        setSaveState({ status: "saved" });
      })
      .catch((error: unknown) => {
        setSaveState({
          status: "error",
          message:
            error instanceof ApiError
              ? error.message
              : "설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        });
      });
  }, []);

  return { state, saveState, reload, saveSettings };
}
