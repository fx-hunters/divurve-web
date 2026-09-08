# 0063. 홈에 통화별 분해 도넛과 시장 스파크라인을 붙인다

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | Claude Opus 5 (feat/home-exposure-donut) |
| 변경 유형 | feat |
| 영향 범위 | 화면(홈) / API 타입 / 공용 컴포넌트 |
| 관련 브랜치 | feat/home-exposure-donut (base: fix/forecast-hit-rate) |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #60 / 백엔드 fx-hunters/divurve-api#94 · PR #133 |

## 변경 사유 (Why)

`divurve-web#28 §3` 에서 "홈에 필요한데 응답에 없다"고 요청했던 두 값을 백엔드가
내려주기 시작했다(divurve-api#94, PR #133 머지 완료). **새 계산이 아니라 이미 오는
값을 화면에 붙이는 일이다** — 프론트는 재계산하지 않는다(AGENTS.md §1).

- `fx_status.exposure` — 지금까지 홈은 `top_currency_code` 하나뿐이라 "주력 통화"만
  말할 수 있었다. 통화별 배열이 오므로 분해를 그릴 수 있다.
- `forecast.history` — 최근 30영업일 시계열. 시장 카드가 숫자만 보여 주던 자리에
  흐름을 얹는다.

## 변경 내용 (What)

- `CurrencyExposure` 를 `/xray` 와 `/home/summary` 공용 타입으로 정리했다. 백엔드가
  OpenAPI 컴포넌트를 하나로 합쳤으므로(divurve-api#88) 프론트도 하나를 쓴다.
  기존 `XrayExposure` 는 호출부 호환용 별칭으로 남겼다.
  **별칭은 임시 조치다** — 같은 개념에 이름이 둘이면 다음 사람이 어느 쪽을 쓸지
  모르고, 그것이 이번 스프린트에서 반복된 어휘 분기의 씨앗이다. X-Ray 호출부
  (`xray-presenter.ts` · `xray-exposure-view.tsx` · `types/xray.ts`)를
  `CurrencyExposure` 로 옮기고 별칭을 지우는 것을 후속 작업으로 남긴다.
- `FxStatusData.exposure` 를 **필수 배열**로 뒀다. 서버가 키를 생략해도(전역
  `non_null`) 화면 분기가 늘지 않도록 경계에서 `?? []` 로 접는다.
- `DonutChart` 에 **분해 모드**를 추가했다. `percent`(게이지)와 `segments`(분해)를
  판별 유니온으로 갈라, 둘을 함께 넘기는 불가능한 상태를 타입이 막는다(§7.4).
  기존 게이지 호출부(X-Ray 외화 비중, 홈 폴백)는 그대로 동작한다.
- `Sparkline` 공용 컴포넌트를 새로 만들었다. 축·눈금·툴팁 없는 인라인 SVG 폴리라인이다.
- 홈 시장 카드에 스파크라인을, 외화 현황 카드에 분해 도넛과 통화별 범례를 붙였다.

## 영향 / 리스크

**⚠️ 두 `history` 의 날짜 키가 다르다.** 같은 개념인데 스키마가 갈라져 있다:

| 출처 | 스키마 | 날짜 키 |
|---|---|---|
| `GET /home/summary` 의 `forecast.history` | `HistoryPointDto` | **`date`** |
| `GET /forecast` 의 `history` | `History` | **`d`** |

섞어 쓰면 조용히 빈 스파크라인이 된다. `home-market.ts` 경계에서 `MarketHistoryPoint`
(`date`) 하나로 통일하고, `/forecast` 쪽만 `d → date` 로 옮긴다.

**빈 상태·`NaN` 방지** (완료 조건):

| 상황 | 결과 |
|---|---|
| `exposure` 키 없음 / 빈 배열 | 분해 도넛 대신 기존 외화 비중 게이지. 자산이 아예 없으면 기존 안내 문구 |
| `history` 키 없음 | 빈 배열 → 카드가 선을 감춘다 |
| 관측점 1개 | 선이 될 수 없어 감춘다 |
| 관측값이 전부 같음 | 진폭 0. 눈금 없는 평평한 선이 "변동 없음"으로 오해되므로 감춘다 |
| 조각 합계 0 | 각도를 낼 수 없어 도넛을 그리지 않는다 |

`sharePct` 변환은 X-Ray 와 **같은 규칙**(`Math.round(ratio * 1000) / 10`)이다. 두
화면이 같은 `PortfolioSnapshot` 에서 나온 같은 값을 그리므로 반올림이 갈리면 숫자가
어긋난다(완료 조건: "홈의 exposure 와 /xray 의 exposure 가 같은 값으로 보인다").
화면 간 import 는 레이어를 넘으므로(§7.1) 규칙만 맞췄다 — 지금 이 한 줄이
`xray-presenter` · `forecast-presenter` · `home-presenter` 세 곳에 있다. 공용 유틸로
모으는 것은 별건으로 남긴다.

**초기 로드의 `/forecast` 왕복** (완료 조건): **이미 줄어 있었다.** UI 개편 때
`MarketSummarySection` 이 `summarySnapshot` 을 받아 "첫 화면은 이 값으로 그리고 다시
조회하지 않는" 구조가 됐다. 이번 변경은 그 스냅샷에 `history` 를 얹었을 뿐이라
왕복 수는 그대로다. 통화쌍을 바꾸면 여전히 `/forecast` 를 부른다 —
`/home/summary` 가 통화쌍 파라미터를 받지 않기 때문이다.

**이슈의 파일 표와 다른 점**: 이슈는 스파크라인을 `ForecastSummaryData` 에 넣으라고
했으나, UI 개편 이후 이 타입은 **아무 화면도 렌더하지 않는다**(시장 카드가
`HomeMarketSnapshot` 경로로 대체했다). 그래서 스파크라인은 `HomeMarketSnapshot` ·
`MarketSummaryView` 에 넣었다.

## 검증

- [x] 테스트 통과 + 커버리지 100% (108 files / 863 tests)
- [x] `npm run lint` 0 errors
- [x] `npm run build` (tsc --noEmit 포함) 성공
- [x] `share` 0.6388 → `sharePct` 63.9 로 X-Ray 와 같은 반올림 확인

## 롤백 방법

이 커밋을 revert 하면 홈은 이전의 외화 비중 게이지와 숫자만 남는다. 서버가 두 필드를
계속 보내도 프론트가 읽지 않을 뿐이라 오류로 이어지지 않는다.
