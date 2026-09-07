# 0027. 내 자산(X-Ray) 탭을 실제 API 데이터로 통합

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-07 |
| 작성자 | Claude (Opus 5) |
| 변경 유형 | feat / fix |
| 영향 범위 | 화면(내 자산) / API 계약 / 타입 / 테스트 인프라 |
| 관련 브랜치 | feat/xray-api-integration |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #24 |

## 변경 사유 (Why)

내 자산 탭은 `isDemo` 분기로 `use-xray.ts` 안의 `DEMO_XRAY_DATA` 상수를 렌더하고 있었다. 데모 데이터 결정 주체를 BE로 옮기는 작업(0023)의 세 번째 도메인이다.

작업 전 배포 BE를 실호출해 확인한 결과, **FE가 부르던 경로 세 개가 아예 존재하지 않았다.** 그대로 API 화면으로 전환했다면 404 세 방으로 화면이 통째로 깨진다.

| FE 호출 | 실제 |
|---|---|
| `GET /api/v1/fit/concentration` | **404.** 집중도는 `/xray`·`/fit` 응답에 내장된 필드이고 별도 엔드포인트가 없다 |
| `POST /api/v1/xray/stress` (`shocks: {통화: 비율}`) | **404.** `GET /stress/scenarios`로 코드를 받아 `POST /stress/runs`에 `scenarioCode` 하나를 보낸다 |
| `POST /api/v1/fit/simulate` | **404.** `POST /fit/preview` (요청 바디는 그대로 맞았다) |

`GET /xray`, `GET /xray/attribution`은 경로도 쿼리 변환도 정상이었다.

## 변경 내용 (What)

- `api/generated/divurve-api.ts`: X-Ray 계열을 실제 응답 기준으로 전면 재작성. `XrayConcentration`(`{topCurrencyCode?, share?, status}`)·`FitResponse`·`StressScenario`·`StressRunResponse`·`FitPreviewResponse` 신설, `XrayResponse`에 누락돼 있던 `krwAssetKrw` 추가
- `api/xray.ts`: 경로 세 개 교정. `/xray`는 기준 시각을 쓰기 위해 `requestWithMeta`로 바꾸고, 묶음에 `/fit`·`/stress/scenarios`를 포함
- `screens/xray/xray-presenter.ts` 신규: 번들 → 화면 뷰 데이터 순수 변환
- `use-xray.ts`: API 훅으로 재작성(loading/error/empty/success + 시나리오 실행 + 비중 조정). `use-xray-api.ts`를 흡수하고, **의존성을 ref로 참조**해 호출자가 인라인 객체를 넘겨도 조회가 반복되지 않게 한다
- `xray-screen.tsx`: `isDemo` 분기 삭제
- 삭제: `xray-api-screen.tsx`, `use-xray-api.ts`, `api/fixtures/xray-api-scenarios.ts`, `DEMO_XRAY_DATA`

## 영향 / 리스크

### 서버에 대응 데이터가 없어 걷어낸 화면 요소

AGENTS.md §1(계산 로직을 프론트에 재구현하지 않는다)에 따라, 서버가 주지 않는 값을 FE가 만들어 채우는 대신 해당 요소를 제거했다.

| 제거한 요소 | 이유 |
|---|---|
| 분산효과 시뮬레이터의 "조정 전/후 변동성 바" | `portfolioVol`이라는 개념이 X-Ray/Fit 도메인 전체에 없다. 기존 코드는 `Math.max(35, 75 - eurSimulationPct * 0.7)`로 **FE가 지어낸 수치**였다 |
| 통화별 성격 비교 표("변동성 보통", "유동성 매우 높음") | 통화의 정성 라벨을 주는 엔드포인트가 없다 |
| 예정 외화 지출 카드 | 플래너 도메인 데이터이고, 해당 API는 `route.enabled=false`로 501을 반환한다 |
| 자산 편집 버튼과 안내 토스트 | "준비 중입니다"만 띄우던 자리 표시자 |

변동성 바가 있던 자리는 **비중 조정 시뮬레이터**로 바꿨다. `POST /fit/preview`가 실제로 주는 조정 전후 집중도를 보여주므로, 같은 질문("EUR을 더 사면 어떻게 되나")에 서버가 계산한 답을 낸다.

### 표시 항목 변경

| 위치 | 변경 전 (fixture) | 변경 후 (서버 값) |
|---|---|---|
| 통화별 노출 | USD/JPY/EUR 고정 3칸 | `exposure[]` 배열 그대로. 통화 색은 컨벤션 7.2대로 고정 배정하고 그 밖은 중립색 |
| 집중도 기준선 마커 | 항상 60% | `/fit`의 `relation.facts.threshold`. **위험성향 미측정 계정에는 표시하지 않는다** |
| 집중도 판정 | "집중 높음" 고정 | `concentration.status` (`ok`·`watch`·`over`·`unknown`) |
| 손익 분해 | 주가/환율/상호작용 3행 고정 | `components[]` 4행(비용 포함). 라벨도 서버가 준 것을 쓴다 |
| 손익 기여도 | `+7.2%` | `5.8%p` — 서버 `contribution_pp`는 퍼센트포인트라 단위를 바로잡았다 |
| 종목별 상세 | 심볼 + 단일 수익률 | `byHolding[]`의 티커·평가액·원화 기준 수익률 |
| 스트레스 시나리오 | 2008/2020/직접설정 3종, 결과가 사전 계산돼 있음 | 서버 마스터 목록. 고르면 `POST /stress/runs`로 **실행 시점에 계산**된다 |

### 테스트 인프라

`src/test/setup.ts`에서 전역 `fetch`를 즉시 거절시킨다. 의존성 주입 없이 마운트되는 화면(App 통합 테스트)이 `https://api.test`로 실제 요청을 보내 jsdom에서 DNS 조회가 수십 초 매달렸고, 그 탓에 `app.test.tsx`가 커버리지 실행에서 간헐적으로 타임아웃됐다. 함께 `testTimeout`을 20초로 올렸다 — 앱 전체를 28번 렌더하는 파일이라 계측이 붙으면 기본 5초를 넘긴다.

### 남은 제약

데모 계정의 `holdings`(AAPL·VOO)·`deposits`(USD 3000)는 채워져 있지만 **매입가와 현재가가 같아 손익 분해 값이 전부 0**이다. 손익 UI를 실데이터로 눈으로 검증할 수 없다. 매입일자·매입환율이 채워진 시드를 BE에 요청해야 한다.

## 검증

- `npm run lint` — 오류 0 (경고 10, 기존 `react-refresh` 경고)
- `npm run build` — 성공
- `npm run test -- --coverage` — 60 파일 363 테스트 통과, 라인·분기·함수·구문 커버리지 100%
- 배포 BE 실호출로 4개 경로 확인: 묶음 조회, 시나리오 실행(`₩ -228,396`), 비중 조정 요청(서버 검증 오류 "조정 대상 통화 JPY가 포트폴리오에 없습니다."가 화면에 그대로 노출됨), 탭 전환

## 롤백

`feat/xray-api-integration` 병합 커밋을 revert한다. 경로 교정만 남기려면 `api/xray.ts`와 `api/generated/divurve-api.ts` 변경만 따로 체리픽한다.
