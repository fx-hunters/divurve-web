import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import { fetchForecastBundle } from "../../api/forecast";
import type { ForecastBundle } from "../../api/generated/divurve-api";
import {
  DEFAULT_FORECAST_PAIR,
  DEFAULT_FORECAST_PERIOD,
  type ForecastPair,
  type ForecastPeriod,
} from "../../types/forecast";

export type ForecastLoader = (
  pairCode: string,
  horizonDays: number,
) => Promise<ForecastBundle>;

export type ForecastState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "success"; readonly data: ForecastBundle };

function isEmptyForecast(bundle: ForecastBundle): boolean {
  return (
    bundle.forecast.history.length === 0 &&
    bundle.forecast.band.length === 0 &&
    bundle.forecast.modelPath.length === 0
  );
}

export function useForecast(loader: ForecastLoader = fetchForecastBundle) {
  // 선택 상태는 이 화면에서만 쓰이므로 전역으로 올리지 않는다(AGENTS.md §7.5).
  const [pair, setPair] = useState<ForecastPair>(DEFAULT_FORECAST_PAIR);
  const [period, setPeriod] = useState<ForecastPeriod>(DEFAULT_FORECAST_PERIOD);
  const [state, setState] = useState<ForecastState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  // 호출자가 loader를 인라인으로 만들어 넘겨도 조회가 반복되지 않도록
  // ref로 최신 값만 참조한다. loader 교체는 재조회 신호가 아니다.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  // 통화쌍 객체를 그대로 의존성에 넣으면 참조가 바뀔 때마다 재조회한다.
  // 실제 요청을 가르는 값은 코드 하나뿐이므로 그것만 본다.
  const pairCode = pair.code;

  useEffect(() => {
    let isActive = true;
    setState({ status: "loading" });

    void loaderRef
      .current(pairCode, period)
      .then((data) => {
        if (!isActive) return;
        setState(
          isEmptyForecast(data)
            ? { status: "empty" }
            : { status: "success", data },
        );
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setState({
          status: "error",
          message:
            error instanceof ApiError
              ? error.message
              : "환율 범위 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
        });
      });

    return () => {
      isActive = false;
    };
  }, [pairCode, period, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { pair, period, state, setPair, setPeriod, reload };
}
