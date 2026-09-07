# 0029. 숫자 경계 응답 키 표기 교정 — sensitivity1pctKrw 대소문자 + 변환 회귀 테스트

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-07 |
| 작성자 | Claude (Opus 5) |
| 변경 유형 | fix |
| 영향 범위 | API 타입 계약 / 화면(Home·X-ray) |
| 관련 브랜치 | fix/forecast-numeric-key-mismatch |
| 관련 커밋 | (PR 병합 후 기입) |
| 관련 이슈·PR | #21 |

## 변경 사유 (Why)

백엔드 PR `fx-hunters/divurve-api#65`(숫자 경계 `SNAKE_CASE` 누락 수정)가 프론트에 미치는
영향을 대조하다 시작했다. 결론부터 적으면 **그 PR 자체로 깨지는 곳은 없다.**

`api/client.ts` 의 `snakeToCamelKey` 는 `/_([a-z0-9])/` 로 밑줄 뒤 숫자도 매치하는데
`"8".toUpperCase() === "8"` 이라 결과적으로 **밑줄만 사라진다**. 그래서 백엔드가
`interval_80` 을 보내든 이전 키인 `interval80` 을 보내든 프론트에는 똑같이 `interval80` 으로 도착한다.
`per_1pct_krw`·`coverage_80`·`sensitivity_1pct`·`p50_lo` 도 마찬가지다.

대조 과정에서 두 가지가 드러났다.

1. **`forecast.volatility` 키 불일치** — 타입이 `realized30d`/`percentile5y` 로 선언돼 있어
   어느 백엔드 버전과도 맞지 않았다. 다만 이 건은 병행 진행 중이던 `feat/forecast-api-integration`
   브랜치가 같은 내용을 이미 교정했다. 중복 수정으로 충돌을 만들지 않기 위해 이 브랜치에서는 제외했다.
2. **`sensitivity1PctKrw` 의 대문자 `P`** — 이 변경이 다루는 대상이다.

실제 응답 키 `sensitivity_1pct_krw` 는 `sensitivity1pctKrw`(소문자 `p`)로 변환된다.
프론트는 `sensitivity1PctKrw` 로 쓰고 있었다. 현재 이 필드는 목 데이터 전용이라 동작상 문제가
없지만, `/home/summary` 를 실제 API에 붙이는 순간 조용히 `undefined` 가 된다.
연동 시점에 디버깅하는 것보다 지금 이름을 맞춰두는 편이 싸다.

**이런 착오가 테스트를 통과하는 구조가 근본 원인이다.** 픽스처를 손으로 camelCase로 적으면
타입·화면·픽스처 세 곳이 서로만 일관되고 실제 응답과는 어긋난 채 커버리지 100%가 나온다.
백엔드는 같은 종류의 사고를 ArchUnit 회귀 테스트(`DtoSnakeCaseDigitBoundaryTest`)로 막았다.
프론트도 최소한 변환 대응표를 고정해, 다음에 같은 착오가 생기면 드러나게 했다.

## 변경 내용 (What)

- `sensitivity1PctKrw` → `sensitivity1pctKrw`, `fxSensitivity1PctKrw` → `fxSensitivity1pctKrw` (8곳)
  - `types/home.ts`, `types/xray.ts`, `api/fixtures/home-dashboard.ts`, `screens/home/fx-holding-card.tsx`,
    `screens/xray/xray-exposure-view.tsx`, `screens/xray/use-xray.ts` 및 관련 테스트 2건
- `client.test.ts` 에 실제 백엔드 키 10종의 camelCase 대응표를 고정하는 회귀 테스트 추가
- `toSnakeCase` 가 숫자 경계 밑줄을 복원하지 못한다는 현재 동작을 테스트로 명시 (아래 리스크 항목)

## 영향 / 리스크

- 순수 식별자 개명이다. 화면에 표시되는 값도, 네트워크로 나가는 것도 바뀌지 않는다.
- `feat/forecast-api-integration` 과 **파일이 하나도 겹치지 않는다.** 독립적으로 머지 가능하다.
- 백엔드 `#65` 로 바뀐 나머지 키는 변환 후 camelCase가 이전과 동일해 대응이 필요 없었다.
- `GET /market/regime`, `POST /plans/preview`(`worst_5_rate`) 는 프론트에 아직 소비처가 없다.

### 남는 구조적 리스크 — 별도 결정 필요

`camelToSnakeKey` 는 대문자 앞에만 밑줄을 넣으므로 **숫자 경계를 복원하지 못한다**
(`vol30d` → `vol30d`). 즉 `toCamelCase` 는 비가역이다.

지금 문제되는 필드는 전부 응답 전용이라 실해는 없다. 하지만 **요청 바디에 숫자 경계 필드가 생기면
백엔드가 읽지 못한다.** 현재 동작을 테스트로 고정만 해두고 수정은 하지 않았다. 선택지는 둘이다.

- (A) 현행 유지 + "요청 DTO에는 숫자 경계 필드를 두지 않는다"를 백엔드와 합의 — 비용 0
- (B) `camelToSnakeKey` 를 백엔드 규약(`[a-z]{2,}[0-9]`)에 맞춰 수정 — 단 `p50Lo` 같은
  단일문자 접두 케이스가 깨지지 않도록 판정 기준을 백엔드와 정확히 일치시켜야 한다

별도 관찰: `apiPath()` 는 쿼리 파라미터를 변환하지 않아 `?pairCode=...` 가 camelCase 그대로 나간다.
이번 범위 밖이라 손대지 않았고 백엔드 수용 여부 확인이 필요하다.

## 검증

- [x] 테스트 통과 + 커버리지 100% — `npm run test -- --coverage`
- [x] `tsc --noEmit` 통과, `eslint` 에러 0 (기존 `react-refresh` 경고만 잔존)
- [x] (수치 변경 시) 변경 전후 값 확인 — 계산 로직 변경 없음. 해당 없음

**한계**: 추가한 회귀 테스트는 `toCamelCase` 의 변환 대응표를 고정할 뿐,
타입 선언과 실제 응답의 불일치를 자동으로 잡아주지는 못한다. 그건 픽스처를 실제
snake_case JSON에서 `toCamelCase` 로 생성하도록 바꿔야 가능하고, 별도 작업이다.

## 롤백 방법

이 브랜치의 커밋을 `git revert` 한다. 식별자 개명이라 되돌려도 동작은 동일하다.
