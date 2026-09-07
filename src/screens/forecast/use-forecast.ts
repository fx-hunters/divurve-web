import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/client";
import { fetchForecastBundle } from "../../api/forecast";
import type { ForecastBundle } from "../../api/generated/divurve-api";
import type { ForecastCurrency, ForecastPeriod } from "../../types/forecast";

export type ForecastLoader = (
  pairCode: string,
  horizon: number,
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

export function horizonDaysOf(period: ForecastPeriod): number {
  return period === "30D" ? 30 : 90;
}

export function useForecast(loader: ForecastLoader = fetchForecastBundle) {
  const [currency, setCurrency] = useState<ForecastCurrency>("USD");
  const [period, setPeriod] = useState<ForecastPeriod>("30D");
  const [state, setState] = useState<ForecastState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  // 호출자가 loader를 인라인으로 만들어 넘겨도 조회가 반복되지 않도록
  // ref로 최신 값만 참조한다. loader 교체는 재조회 신호가 아니다.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let isActive = true;
    setState({ status: "loading" });

    void loaderRef.current(`${currency}_KRW`, horizonDaysOf(period))
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
  }, [currency, period, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { currency, period, state, setCurrency, setPeriod, reload };
}
