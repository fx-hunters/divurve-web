# 0024. 생성 API 타입을 실제 배포 계약과 재동기화

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-07 |
| 작성자 | Claude (Opus 5) |
| 변경 유형 | fix / refactor |
| 영향 범위 | API 경계 / 타입 / 테스트 |
| 관련 브랜치 | feat/mypage-api-integration |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #17 |

## 변경 사유 (Why)

마이페이지를 실제 API에 연결하는 과정에서 화면에 `서버 점수 undefined`가 출력되는 것을 발견했다. 배포된 백엔드(`https://divurve-api.onrender.com/v3/api-docs`)를 확인한 결과, **`src/api/generated/divurve-api.ts`가 실제 계약과 여러 곳에서 어긋나 있었다.**

이 파일은 자동 생성이 아니라 손으로 발췌한 부분 계약이라(파일 헤더 주석), 그 사이 백엔드가 앞서 나간 것을 따라잡지 못했다. 실제 스펙은 엔드포인트 **57개**인데 발췌본에는 21개만 있고, 그중 일부는 경로·필드가 다르다.

특히 다음 두 가지는 **조용히 잘못된 요청을 보내거나 값을 버리고 있었다.**

- 응답 봉투 `meta`가 실제로는 `{ as_of, data_state, sources, is_demo, regime, model_version }`인데 FE는 `timestamp`를 기대했다. `parseMeta`가 형식 불일치로 판단해 매번 `{ timestamp: "" }`로 폴백하고 있었다 — 기준 시각을 통째로 버리고 있었던 셈이다.
- 쿼리 파라미터가 snake_case(`pair_code`, `horizon_days`, `currency_code`)인데 FE는 camelCase로 보냈다. 그 결과 `/api/v1/forecast`는 **`400 VALIDATION_FAILED`**(`필수 요청 파라미터가 없습니다: pair_code`)를 반환하고 있었다. 요청 바디는 `toSnakeCase`로 변환하면서 쿼리는 변환하지 않은 비대칭이 원인이다.

또한 "계약이 없다"고 판단해 UI에서 빼두었던 것들이 **실제로는 존재했다** — 알림 설정 저장(`notify*` 5종), 성향 진단 등급·점수·진단일. 잘못된 타입 때문에 멀쩡한 기능을 포기하고 있었다.

## 변경 내용 (What)

- `api/client.ts`
  - `ApiMeta`를 실제 `Meta` 스키마로 교체: `asOf`(필수) + `dataState`/`sources`/`isDemo`/`regime`/`modelVersion`
  - `apiPath()`가 쿼리 키를 `camelToSnakeKey`로 변환. 요청 바디와 같은 규칙을 한 곳에서 적용하고, 호출부는 계속 camelCase만 쓴다
- `api/forecast.ts`: `horizon` → `horizonDays` (실제 파라미터명 `horizon_days`)
- `api/generated/divurve-api.ts`
  - `TokenResponse` + `onboarded`
  - `ProfileResponse` + `onboarded`, `onboardedAt`
  - `SettingsResponse` / `SettingsUpdateRequest` + 알림 5종(`notifyStepDue`·`notifyRegimeShift`·`notifyDeadlineNear`·`notifyTargetZone`·`notifyConcentration`), `NotificationSettingKey` 추가
  - `RiskProfileResponse` 전면 교체: `{ riskType, score, answers }` → `{ status, grade, gradeLabel, score, diagnosedOn, concentrationThreshold, simple, detail, limitationNote }`
  - `NotificationDto` 이름 부여
- `src/test/api-fixtures.ts`: 골든 데이터를 실제 응답 형태로 갱신

## 영향 / 리스크

- `/api/v1/forecast` 계열이 **400에서 정상 호출로 바뀐다.** 다만 응답 타입은 아직 검증하지 않았다(환율 범위 화면 통합 시 다룬다)
- `meta.timestamp`를 읽던 `home-api-summary-view.tsx`가 `meta.asOf`로 바뀐다. 이제 실제 기준 시각이 표시된다
- 진단 전 계정은 `/me/risk-profile`이 404가 아니라 **`200` + `status: "not_measured"`**로 온다. `fetchRiskProfile`의 404→null 처리는 그대로 두되, 화면은 `status`로 판정한다

### 아직 남은 계약 불일치 (후속 PR에서 처리)

| 대상 | 발췌본 | 실제 |
|---|---|---|
| `GET /home/summary` | `{ todayAction, currencyStatus, notice, weeklyChange, marketSummary }` | `{ blocks: [{ order, key, state }], … }` — 구조가 다름 |
| `GET /fit/concentration` | 존재 | **404**. 실제 경로는 `GET /api/v1/fit` |
| `POST /xray/stress` | 존재 | 실제는 `POST /api/v1/stress/runs` + `GET /api/v1/stress/scenarios` |
| `GET /goals` | `{ goals: GoalResponse[] }` | `{ goals, routeEnabled }` |

또한 발췌본에 없던 계약이 다수 확인됐다: `GET /route/context`, `GET/POST /holdings`·`/deposits`·`/krw-assets`, `POST /goals`(목표 생성), `POST /plans/preview`, `POST /me/risk-profile/simple|detail`(온보딩 문항), `POST /me/onboarding/complete`, `GET /market/regime`, `GET /currencies`, `POST /ai/explain`. **"계약이 없어 못 한다"고 판단했던 여러 화면이 실제로는 가능하다.**

## 검증

- [x] 테스트 통과 + 커버리지 100% (338 passed)
- [x] `npm run lint` 오류 0건, `npm run build` 성공
- [x] 실제 배포 BE 대상 확인: `/v3/api-docs` 스펙과 `/me`·`/me/settings`·`/me/risk-profile`·`/notifications` 실응답 대조
- [x] (수치 변경 없음 — 표시하던 값을 버리지 않게 됐을 뿐)

## 롤백 방법

단독 revert 가능하다. 되돌리면 `meta` 값이 다시 버려지고 `/forecast`가 다시 400을 반환한다.
