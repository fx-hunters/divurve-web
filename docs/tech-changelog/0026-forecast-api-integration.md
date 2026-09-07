# 0026. 환율 범위 탭을 실제 API 데이터로 통합

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-07 |
| 작성자 | Claude (Opus 5) |
| 변경 유형 | feat / fix |
| 영향 범위 | 화면(환율 범위) / API 계약 / 타입 |
| 관련 브랜치 | feat/forecast-api-integration |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #20 |

## 변경 사유 (Why)

환율 범위 탭은 `isDemo` 분기로 `api/fixtures/forecast-screen.ts`의 고정 데이터를 렌더하고 있었다. 데모 데이터 결정 주체를 BE로 옮기는 작업(0023)의 두 번째 도메인이다.

작업 전 배포 BE의 실제 응답을 확인한 결과, 생성 타입이 **네 군데에서 실제 계약과 어긋나 있었다**. 그대로 두면 API 화면으로 전환하는 순간 401 또는 `undefined` 접근으로 깨진다.

| 항목 | FE 기존 가정 | 실제 배포 응답 |
|---|---|---|
| `GET /api/v1/forecast` 인증 | 공개(`requiresAuth: false`) | **인증 필요** — 토큰 없이 호출하면 `UNAUTHORIZED` |
| 밴드 필드명 | `path` | **`band`** |
| 변동성 | `{ realized30d, percentile5y, regime }` | **`{ regime, vol_30d, vol_percentile_5y }`** |
| 80% 구간 | `{ lo, hi, widthPct, vs3yAvg }` | **`vs_3y_avg` 없음** |

`factors`·`model-performance`·`events` 셋은 실제로 공개 엔드포인트가 맞았다.

## 변경 내용 (What)

- `api/generated/divurve-api.ts`: forecast 계열을 실제 응답 기준으로 재동기화. `ForecastPathPoint` → `ForecastBandPoint`, `baseDate`·`labels`·`modelInfo`·`uncertaintyNote` 추가, `ModelPerformanceResponse`에 `rwImprovement`·`evaluatedAt` 추가. `ForecastBundle`에 응답 meta의 `asOf`를 포함
- `api/forecast.ts`: `/forecast`만 인증 요청(`requestWithMeta`)으로 정정하고 나머지 셋은 공개 요청 유지
- `screens/forecast/forecast-presenter.ts` 신규: 번들 → 화면 뷰 데이터 순수 변환. `forecast-api-presenter.ts`를 흡수
- `use-forecast.ts`: API 훅으로 재작성(loading/error/empty/success). `use-forecast-api.ts`를 흡수하고, **loader를 ref로 참조**해 호출자가 인라인 함수를 넘겨도 조회가 반복되지 않게 한다
- `forecast-screen.tsx`: `isDemo` 분기 삭제. 데모 UI 레이아웃을 정본으로 유지한 채 서버 데이터로 채운다
- 삭제: `forecast-api-screen.tsx`, `use-forecast-api.ts`, `forecast-api-presenter.ts`, `api/fixtures/forecast-screen.ts`

## 영향 / 리스크

### 표시 항목 변경

| 위치 | 변경 전 (fixture) | 변경 후 (서버 값) |
|---|---|---|
| 상단 안내 | `다음 갱신: 15:00 UTC` (고정 문자열) | `기준 시각: {meta.as_of}` |
| 변동성 백분위 | `상위 12%` (고정) | `5년 중 63백분위` (`vol_percentile_5y`) |
| 백분위 경고색 | `currency === "JPY"`일 때 | `volatility.regime`이 `high`·`extreme`일 때 |
| 백분위 하단 문구 | `주의가 필요한 구간입니다.` (고정) | 서버 `uncertainty_note` |
| 자산 영향 | `하단 이탈시 ₩-1.2M` (고정) | `1% 움직일 때 ₩{user_impact.per_1pct_krw}` |
| 모델 성적 MAE | `₩ 12.4` | `평균 오차율 3.1%` — 서버 `mae`는 금액이 아니라 **비율**이었다 |

`hitRate`·`coverage80`·`rwImprovement`는 서버가 0~1 비율로 주므로 표시 단위만 %로 바꾼다(`toPercent`). 막대 폭(`barWidthPx`)은 기여도 최댓값 대비 비례로 파생하는 **표현값**이며, 수치는 서버 값을 그대로 쓴다(AGENTS.md §1).

### 빈 상태

현재 배포에서 `GET /forecast/factors`는 세 통화 모두 `factors: []`를 준다. "전망 동인" 카드는 안내 문구를 렌더하고, 선택 통화에 해당 일정이 없을 때도 마찬가지다.

### 무한 조회 함정

`useForecast(loader)`의 조회 이펙트 의존성에 `loader`가 들어 있으면, 호출자가 JSX 안에서 `loader={vi.fn()}`처럼 인라인으로 넘기는 순간 매 렌더마다 새 참조가 생겨 조회가 무한 반복된다(실제로 테스트 워커가 OOM으로 죽었다). 0025의 `use-mypage`와 같은 함정이라 같은 방식(ref 참조)으로 막았다.

## 검증

- `npm run lint` — 오류 0 (경고 9, 기존 `react-refresh` 경고)
- `npm run build` — 성공
- `npm run test -- --coverage` — 60 파일 350 테스트 통과, 라인·분기·함수·구문 커버리지 100%
- 배포 BE 실호출로 USD/JPY/EUR × 30D/90D 응답 형태 확인

## 롤백

`feat/forecast-api-integration` 병합 커밋을 revert한다. 생성 타입 재동기화가 함께 되돌아가므로, 계약 수정만 남기려면 `api/generated/divurve-api.ts`와 `api/forecast.ts` 변경만 따로 체리픽한다.
