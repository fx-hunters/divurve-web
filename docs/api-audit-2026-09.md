# 백엔드 API 호출 전수 점검 리포트 (2026-09)

| 항목 | 내용 |
|---|---|
| 대상 이슈 | fx-hunters/divurve-web#47 |
| 프론트 기준 | `docs/api-audit` (베이스 `388e880`, `develop` 최신) |
| 백엔드 기준 | `fx-hunters/divurve-api` `develop` `9d65c5c` (2026-09-08 11:37 KST) |
| 대조 대상 | `src/api/**` 의 모든 호출 ↔ `app/src/main/java/com/divurve/api/controller/**` |
| 점검 항목 | 경로 · HTTP 메서드 · 쿼리 파라미터(snake_case)와 허용값 · 요청 본문 · 응답 필드/타입 · `data`+`meta` 언래핑 · 인증(`@CurrentUser`/`@CurrentAdmin`) |

> 이 리포트는 **조사·문서화만** 한다. 기능 코드는 고치지 않았다. 발견한 불일치는 §3 에 심각도와
> 처리 구분(수정함 / 후속 이슈 필요 / BE 사안)을 붙여 두었고, 이슈 초안은 §7 에 있다.

---

## 1. 요약

- 프론트가 호출하는 엔드포인트 **36개**를 전수 대조했다. 그중 **1개는 백엔드에 존재하지 않는다**(§3 H1).
- **경로·메서드·쿼리 파라미터·인증 요구**는 존재하지 않는 1개를 빼면 **전부 일치**한다.
- 불일치는 거의 전부 **응답 본문 해석**과 **Enum 문자열 어휘**에서 나왔다. 이 둘은 TypeScript가
  잡지 못한다 — `request<T>()` 가 `as T` 로 캐스팅하고, 라벨 조회 테이블이 `?? fallback` 으로
  모르는 코드를 흘려보내기 때문이다(§4).
- 심각도: **High 7건 · Medium 6건 · Low 8건**. High 중 1건은 BE 사안, 6건은 FE 후속 이슈다.
- `data`+`meta` 언래핑, `snake_case→camelCase` 경계 단일화, `VITE_API_URL` 단일 경로,
  `/ai/explain` 의 200+`fallback` 계약, `facts` 0~1 스케일 규칙, `api/connectivity.ts` 잔재 없음 —
  **모두 지켜지고 있다**(§5).

---

## 2. 엔드포인트 전수 표

인증 열: `user` = `@CurrentUser`, `admin` = `@CurrentAdmin`, `public` = 인증 인자 없음.
FE 열의 `requiresAuth` 는 `api/client.ts` 기본값 `true` 를 뜻한다.

### 2-1. 인증

| # | 프론트 호출 | 메서드 · 경로 | 백엔드 | 인증 | 일치 |
|---|---|---|---|---|---|
| 1 | `auth.ts signup()` | `POST /api/v1/auth/signup` | `AuthController.signup` | public | ✅ 본문 `email·password·name` 일치. FE 타입의 `onboardingPurpose` 는 BE `SignupRequest` 에 없음(미전송이라 무해, L1) |
| 2 | `auth.ts login()` | `POST /api/v1/auth/login` | `AuthController.login` | public | ✅ |
| 3 | `auth.ts refreshSession()` | `POST /api/v1/auth/refresh` | `AuthController.refresh` | public | ✅ `refreshToken`→`refresh_token` 변환 일치 |
| 4 | `auth.ts startDemoSession()` | `POST /api/v1/auth/demo` | `AuthController.demo` | public | ✅ 본문 없음 |

`TokenResponse(access_token·refresh_token·expires_in·is_demo·onboarded)` — FE 타입과 완전 일치.

### 2-2. 홈 · 전망

| # | 프론트 호출 | 메서드 · 경로 | 백엔드 | 인증 | 일치 |
|---|---|---|---|---|---|
| 5 | `home.ts fetchHomeSummary()` | `GET /api/v1/home/summary` | `HomeController.getSummary` | user | ⚠️ **H4** `goals_route.route_enabled` 는 BE 이슈 #84 에서 제거됨. FE가 여전히 읽음 |
| 6 | `home.ts fetchHomeMarketSnapshot()` | `GET /api/v1/forecast?pair_code=` | `ForecastController.getForecast` | user | ✅ `horizon_days` 생략 → 서버 기본 30 |
| 7 | `forecast.ts` | `GET /api/v1/forecast?pair_code&horizon_days` | 〃 | user | ⚠️ **M2** 허용값이 `7·14·30·60·90·180` 으로 넓어졌는데 FE 선택지는 `30·90` |
| 8 | `forecast.ts` | `GET /api/v1/forecast/factors?pair_code` | `ForecastController.getFactors` | public | ✅ 계약 일치. 단 BE가 항상 빈 배열(L6) |
| 9 | `forecast.ts` | `GET /api/v1/forecast/model-performance?pair_code&horizon_days` | `ForecastController.getModelPerformance` | public | ✅ `coverage_80`→`coverage80` 포함 일치 |
| 10 | `forecast.ts` | `GET /api/v1/events` | `ForecastController.getEvents` | public | ✅ |

`ForecastResponse` 는 `interval_80`·`vol_30d`·`vol_percentile_5y`·`per_1pct_krw`·`p50_lo`/`p80_hi` 까지
FE 타입과 일치한다. 홈의 `sensitivity_1pct_krw` 도 일치.

### 2-3. X-Ray · 적합도 · 스트레스

| # | 프론트 호출 | 메서드 · 경로 | 백엔드 | 인증 | 일치 |
|---|---|---|---|---|---|
| 11 | `xray.ts fetchXrayOverview()` | `GET /api/v1/xray` | `XrayController.getXray` | user | ⚠️ **H5** `concentration.status` 어휘 불일치(라벨 테이블). 필드 자체는 일치 |
| 12 | `xray.ts fetchXrayBundle()` | `GET /api/v1/xray/attribution?currency_code` | `XrayController.getAttribution` | user | ✅ 파라미터 선택적, 표기 일치 |
| 13 | `xray.ts fetchXrayBundle()` | `GET /api/v1/fit` | `FitController.getFit` | user | ✅ |
| 14 | `xray.ts previewFitAdjustment()` | `POST /api/v1/fit/preview` | `FitController.preview` | user | ⚠️ **M6** 응답 `concentration` 이 `{before,after,threshold}` 인데 FE는 `{share,status}` 로 읽음 |
| 15 | `xray.ts fetchXrayBundle()` | `GET /api/v1/stress/scenarios` | `StressController.listScenarios` | public | ✅ 필드 일치. FE가 불필요하게 인증 요구(L5) |
| 16 | `xray.ts runStressScenario()` | `POST /api/v1/stress/runs` | `StressController.run` | user | ✅ 본문 `scenario_code`, 응답 전 필드 일치 |
| 17 | `asset-import.ts` | (11번 재사용) `GET /api/v1/xray` | 〃 | user | ✅ |

### 2-4. 플래너 (목표 · 계획)

| # | 프론트 호출 | 메서드 · 경로 | 백엔드 | 인증 | 일치 |
|---|---|---|---|---|---|
| 18 | `planner.ts fetchPlannerOverview()` | `GET /api/v1/goals` | `GoalController.listGoals` | user | ✅ FE 타입의 `suggested` 는 BE에 없음(미사용, L1) |
| 19 | `planner.ts fetchActivePlan()` | `GET /api/v1/goals/{id}/plans/active` | `PlanController.getActivePlan` | user | ❌ **H2** 응답 계약 전면 드리프트 |
| 20 | `planner.ts fetchPlanVersions()` | `GET /api/v1/goals/{id}/plans` | `PlanController.listPlanVersions` | user | ✅ `plan_id·version·status·reason·plan_end_date·superseded_by·created_at` 일치 |
| 21 | `planner.ts fetchPlanDetail()` | `GET /api/v1/plans/{id}` | `PlanController.getPlan` | user | ❌ **H2** (19번과 동일 응답 타입) |
| 22 | `planner.ts completePlanStep()` | `POST /api/v1/plans/{id}/steps/{seq}/complete` | `PlanController.completeStep` | user | ⚠️ 요청 일치. 응답에 BE가 주는 `executed_date·next_action_seq·already_applied` 누락(L1) |
| 23 | `planner.ts skipPlanStep()` | `POST /api/v1/plans/{id}/steps/{seq}/skip` | `PlanController.skipStep` | user | ❌ **H7·M1** BE는 *미리보기*인데 FE는 "저장했습니다"로 처리. 응답 타입도 전면 불일치 |

### 2-5. 마이페이지 · 알림 · AI

| # | 프론트 호출 | 메서드 · 경로 | 백엔드 | 인증 | 일치 |
|---|---|---|---|---|---|
| 24 | `mypage.ts` | `GET /api/v1/me` | `MeController.getProfile` | user | ✅ |
| 25 | `mypage.ts` | `GET /api/v1/me/settings` | `MeController.getSettings` | user | ✅ 11개 필드 전부 일치 |
| 26 | `mypage.ts updateSettings()` | `PUT /api/v1/me/settings` | `MeController.updateSettings` | user | ✅ 실제 전송은 `notify_*` 5개뿐, 전부 계약 내 |
| 27 | `mypage.ts fetchRiskProfile()` | `GET /api/v1/me/risk-profile` | `MeController.getRiskProfile` | user | ✅ 404 방어는 남아 있으나 BE는 200 + `status:"not_measured"` |
| 28 | `mypage.ts` / `notifications.ts` | `GET /api/v1/notifications` | `NotificationController` | user | ❌ **H3** 필드 3개 불일치 |
| 29 | `ai-explain.ts` | `POST /api/v1/ai/explain` | `AiController.explain` | user | ⚠️ 요청·`fallback` 계약 준수. 응답 타입에 없는 필드 3개 표시 / 있는 필드 2개 무시(**M5**) |

### 2-6. 관리자 콘솔

| # | 프론트 호출 | 메서드 · 경로 | 백엔드 | 인증 | 일치 |
|---|---|---|---|---|---|
| 30 | `admin.ts fetchAdminUsers()` | `GET /api/v1/admin/users?q&is_demo&page&size` | `AdminUserController.list` | admin | ✅ 파라미터·응답(`items·page·size·total_elements·total_pages`) 일치 |
| 31 | `admin.ts fetchAdminUser()` | `GET /api/v1/admin/users/{id}` | `AdminUserController.get` | admin | ✅ |
| 32 | `admin.ts fetchAdminUserData()` | `GET /api/v1/admin/users/{id}/data` | `AdminUserController.data` | admin | ✅ 9개 도메인 키 전부 일치 |
| 33 | `admin.ts fetchAdminCurrencies()` | `GET /api/v1/admin/currencies` | `AdminCurrencyController.list` | admin | ✅ |
| 34 | `admin.ts fetchAdminFxRates()` | `GET /api/v1/admin/fx-rates?pair_code&from&to&rate_type` | `AdminFxRateController.series` | admin | ✅ `rate_type` 허용값 5종(`mid·tt_buy·tt_sell·cash_buy·cash_sell`)이 FE 상수와 일치 |
| 35 | `admin.ts fetchAdminRefreshStatus()` | `GET /api/v1/admin/fx-rates/status` | **없음** | — | ❌ **H1** 백엔드에 매핑 자체가 없다 |
| 36 | `admin.ts refreshAdminFxRates()` | `POST /api/v1/admin/fx-rates/refresh?lookback_days` | `AdminFxRateController.refreshFxRates` | admin | ✅ 응답 신규 필드 4개 미표시(L4) |
| 37 | `admin.ts refreshAdminMacro()` | `POST /api/v1/admin/macro/refresh` | `AdminFxRateController.refreshMacro` | admin | ✅ 본문 `series_ids` 일치 |
| 38 | `admin.ts previewAdminExtraction()` | `POST /api/v1/admin/ai/extract-preview` | `AdminAiController.extractPreview` | admin | ⚠️ 요청 일치. 응답의 `resolved_source_url` 등 3개는 BE 미구현(L3) |

> 표의 번호는 행 번호이고, 실제 고유 엔드포인트는 6번과 7번이 같은 경로라 **36개**다.

### 2-7. 엔드포인트가 아닌 호출

| 프론트 | 실체 | 비고 |
|---|---|---|
| `api/route.ts loadRoutePlan()` | 정적 fixture (`api/fixtures/route-plan.ts`) | 네트워크 호출 없음. 데모 계정 전용 Curve 화면. 백엔드 `GET /api/v1/route/context` 는 구현돼 있으나 미사용(§6) |
| `api/session.ts` / `session-bootstrap.ts` | 브라우저 저장소 + 토큰 갱신 배선 | 401 시 1회 갱신 후 재시도, 순환 의존 회피용 `registerSessionRefresher` — AGENTS.md §7.1 준수 |
| `api/diagnosis-progress-store.ts` · `profile-preferences-store.ts` | `sessionStorage`/`localStorage` 전용 | 서버 전송 없음. 진단 결과가 `POST /me/risk-profile/simple|detail` 로 저장되지 않는다(§6, L7 참고) |

---

## 3. 불일치 목록

각 항목은 **[처리 구분]** 을 달았다: `수정함` / `후속 이슈 필요` / `BE 사안`.

### High

#### H1. `GET /api/v1/admin/fx-rates/status` 가 백엔드에 없다 — **[BE 사안 / 후속 이슈 필요]**

`api/admin.ts:410 fetchAdminRefreshStatus()` 가 호출하지만, `AdminFxRateController`(`@RequestMapping("/api/v1/admin")`)
의 매핑은 `/fx-rates`, `/fx-rates/refresh`, `/fx-rates/gaps`, `/fx-rates/backfill`, `/macro/refresh` 뿐이다.
백엔드 전체에서 `lastFetchedAt` 문자열이 **0건**이다 — BE 이슈 divurve-api#128 이 아직 배포되지 않았다.

- 영향: 관리자 콘솔 "마지막 갱신" 줄(`screens/admin/admin-refresh-panel.tsx`)이 항상 404 에러를 그린다.
- 처리: BE #128 진행 확인. 그때까지 FE는 이 줄을 감추거나 `/fx-rates/gaps` 로 대체할지 결정 필요.

#### H2. 계획 응답 계약이 통째로 어긋나 있다 — **[후속 이슈 필요]**

백엔드가 2026-09-07 `614c216`(#85)에서 계획 API 계약을 교체했는데 FE의
`api/generated/divurve-api.ts: ActivePlanResponse` 는 교체 전 형태 그대로다.

| FE가 읽는 키 | BE `PlanResponse` | 결과 |
|---|---|---|
| `id` | `plan_id` | `undefined` — Curve 노드 id가 `undefined-1` |
| `isActive` | 없음 | `nextStepIndex()` 가 항상 `-1` → **다음 회차 카드가 절대 뜨지 않는다** |
| `reason` | 없음(요약은 `summary`) | 상세 시트의 "계획 근거"가 공란 |
| `safeRatio` | 없음 | `percentFormatter.format(undefined)` → `NaN%` |
| `splitCount` | 없음(`summary.total_rounds`) | "분할 회차"가 `undefined회` |
| `steps[].krwEstimate` | `budget_krw` / `estimated_cost` | 미사용이라 무해 |
| — | `calculation_meta·goal·summary·warnings·disclaimer` | FE가 통째로 버리고 있다 |

`steps[].seq·scheduled_date·amount·executed_amount·status` 는 일치하므로 회차 목록 자체는 그려진다.
`screens/route/planner-plan-facts.ts` 가 `safe_ratio`·`split_count` 를 `undefined` 로 실어
`/ai/explain` facts 에서 두 키가 조용히 사라진다.

**참고 지점**: `fetchPlanVersions()` 가 쓰는 `PlanVersionListResponse` 는 정확히 일치한다 —
같은 파일 안에서 한 타입만 낡았다.

#### H3. 알림 응답 필드 3개가 다르다 — **[후속 이슈 필요]**

| BE `NotificationDto` (직렬화) | FE `NotificationDto` | 결과 |
|---|---|---|
| `kind` | `type` | 미사용이라 무해 |
| `body` | `message` | **알림 본문이 항상 빈칸** (`notification-menu.tsx:54`, `mypage-presenter.ts:99`) |
| `is_read` → `isRead` | `read` | **모든 알림이 "읽음"으로 보인다** — 새 알림 표시가 영구히 꺼짐 |
| `id`·`title`·`created_at` | 동일 | ✅ |

`kind` 허용값도 문서화해 둘 것: `step_due·regime_shift·deadline_near·target_zone·safe_mode·concentration`.

#### H4. `goals_route.route_enabled` 는 백엔드에서 제거됐다 — **[후속 이슈 필요]**

BE `HomeSummaryResponse.GoalsRouteDto` 주석: *"`route_enabled` 는 이슈 #84 에서 제거했다 — 기능이 항상 열려 있다."*
FE `home-presenter.ts:152` 는 여전히 `data.goalsRoute.routeEnabled` 를 읽어 `isRouteEnabled` 로 넘긴다.
값이 `undefined`(falsy)라 **홈의 목표·플래너 카드가 항상 비활성 상태로 렌더된다.**
FE 이슈 #28 의 "route.enabled 활성화" 요청은 이것으로 **해소**되었으므로, FE에서 플래그를 걷어내면 된다.
FE `HomeBlockState` 유니온의 `route_pending` 도 같은 이슈로 사라진 상태값이다(L2).

#### H5. 집중도 상태 어휘가 백엔드와 다르다 — **[후속 이슈 필요]** *(regime `high`/`extreme` 버그와 같은 유형)*

`screens/xray/xray-presenter.ts:20` `CONCENTRATION_STATUS_LABELS = { ok, watch, over, unknown }`.
백엔드 `XrayResponse.Concentration.status` 의 허용값은 `above_threshold · within_threshold · unknown`.

- `unknown` 만 겹친다. 나머지는 `toConcentrationStatusLabel()` 의 `?? status` 로 **원문 코드가 그대로 노출**된다.
- `xray-exposure-view.tsx:108` 의 `status === "over"` 는 **절대 참이 되지 않는다** → 기준선 초과
  위험 배지가 영구히 꺼져 있다.
- 같은 저장소의 `home-presenter.ts:66` 은 `within_threshold`/`above_threshold` 로 **정확히** 매핑한다.
  화면 두 곳이 같은 필드를 서로 다른 어휘로 읽고 있다.

#### H6. 홈 배지 어휘에 `turbulent` 가 없다 — **[후속 이슈 필요]** *(같은 유형)*

BE `MarketRegimeService` 주석: *"국면 4종(`calm/normal/elevated/stress`) → 배지 3종(`normal/caution/turbulent`)"*.
`today.badge` 와 `attention.regime_badge` 에는 **배지 코드**가 실린다.

FE `home-presenter.ts:49` `BADGE_LABELS = { calm, normal, caution, elevated, extreme }`:

- `turbulent` 없음 → 가장 심각한 국면에서 라벨이 원문 `turbulent`, 톤이 `default`(경고색 아님).
- `calm`·`elevated`·`extreme` 은 배지로는 **절대 오지 않는** 유령 항목이다.
- `BADGE_FALLBACK_HEADLINES` 도 `normal`·`caution` 만 있어 `turbulent` 일 때 대체 문구가 없다.

#### H7. 회차 건너뛰기는 미리보기인데 FE는 "저장했다"고 알린다 — **[후속 이슈 필요]**

BE `PlanController.skipStep` 문서: *"건너뛴 뒤의 변경 계획을 **미리보기로 반환**한다. 계획을 즉시
덮어쓰지 않는다 — 적용은 사용자 승인을 거친다."* 응답 `applied` 는 항상 `false`.

`screens/route/use-planner-api.ts` 는 성공 시 `"${sequence}회차 건너뛰기를 서버에 저장했습니다."`
를 띄우고 목록을 재조회한다. 재조회 결과에는 아무 변화가 없으므로 **사용자가 반영됐다고 오해한다.**
실제 적용 경로는 백엔드 `POST /plans/{id}/scenarios/preview` → `POST /plans/{id}/apply` 이며 FE 미연동이다.

### Medium

#### M1. `StepSkipResponse` 타입 전면 불일치 — **[후속 이슈 필요, H7과 묶음]**

FE: `redistributed·achieveProb·consecutiveSkips·safeModeTriggered·newPlanVersion`.
BE: `seq·applied·amount_before·amount_after·remaining_amount·remaining_rounds·per_round_cost_krw·exceeds_budget·adjustment_options`.
겹치는 필드가 **하나도 없다.** 현재는 어떤 필드도 렌더하지 않아 런타임 영향이 H7의 문구뿐이다.

#### M2. `horizon_days` 확장이 반영되지 않았다 — **[후속 이슈 필요]**

BE `ForecastService.ALLOWED_HORIZON_DAYS = List.of(7, 14, 30, 60, 90, 180)` — divurve-api#121 이
PR #131 로 **이미 머지**됐다. FE `types/forecast.ts:37 FORECAST_HORIZON_DAYS = [30, 90]` 과
`api/forecast.ts`·`types/forecast.ts` 주석이 여전히 "30·90만 허용"이라고 적혀 있다.
동작은 정상(부분집합)이지만 배포된 기능을 못 쓰고 주석이 사실과 다르다.

#### M3. 오늘의 핵심 문구 사전이 백엔드 코드 생성 규칙을 다 덮지 못한다 — **[후속 이슈 필요]**

BE `HomeSummaryService.resolveToday()`:
`vol_{regime}_{topCurrency소문자}` (regime ∈ `calm·normal·elevated·stress`), 주력 통화가 없으면 `regime_{regime}`.
FE `TODAY_HEADLINE_LABELS` 는 `vol_{calm,normal,elevated}_{usd,jpy,eur}` 9개뿐이다.

- `vol_stress_*` 누락 → 가장 중요한 상황에서 문구 없음. 그런데 대체 문구(`BADGE_FALLBACK_HEADLINES`)도
  `turbulent` 를 모르므로(H6) 헤드라인이 통째로 비게 된다.
- `regime_*` 계열 전부 누락(외화 자산이 없는 신규 계정).
- 주력 통화가 USD/JPY/EUR 밖이면(예: `vol_normal_gbp`) 역시 누락.

#### M4. 회차 상태 라벨에 `scheduled`·`due` 가 없다 — **[후속 이슈 필요]** *(같은 유형)*

BE `PlanStepStatus`: `scheduled · due · completed · skipped`.
FE `screens/route/plan-version-list.tsx:34 STEP_STATUS_LABELS = { completed, skipped, pending }`.
`pending` 은 존재하지 않는 값이고, 실제로 오는 `scheduled`/`due` 는 라벨이 없어 원문 코드가 노출된다.
(같은 파일의 `STATUS_LABELS`(계획 상태 6종)는 `PlanStatus` 와 **완전히 일치**한다.)

#### M5. `/ai/explain` 응답 필드를 잘못 표시한다 — **[후속 이슈 필요]**

BE `ExplainResponse`:
`explanation{sentences, fallback}`, `verification{numeric_match, regime_disclosed, blocked_phrases, fallback_reason}`.

- FE `Explanation` 의 `sentenceCount`·`explainLevel`·`explainDomain` 은 **BE가 보내지 않는다**.
  `screens/admin/admin-ai-explain-result.tsx` 가 이 셋을 항상 `-` 로 그린다.
- BE가 주는 `regime_disclosed`(국면 고지 검증)와 `fallback_reason`
  (`budget_exhausted`/`verification_failed` 등)은 FE가 **버린다** — 폴백 원인을 알려 주는 값인데
  관리자 콘솔이 못 보여 준다.
- 계약 준수 사항: 200 + `fallback:true` 처리, `explain_level`/`explain_domain` 미전송, `facts` raw 전송은 ✅.

#### M6. `POST /fit/preview` 의 `concentration` 구조가 다르다 — **[후속 이슈 필요]**

BE `FitPreviewResponse.Concentration = { before: Snapshot, after: Snapshot, threshold }`
(`Snapshot = { top_currency_code, share, status }`).
FE 타입은 `XrayConcentration`(`{ topCurrencyCode?, share?, status }`)을 재사용한다.
`screens/xray/xray-fitness-view.tsx:334` 의 `preview.concentration.share` 는 항상 `undefined` →
가정 적용 후 비중이 늘 `-` 로 나온다. `before`/`after` 비교라는 이 API의 핵심 정보를 못 쓰고 있다.

### Low

| # | 내용 | 처리 |
|---|---|---|
| L1 | 생성 타입의 소소한 과부족: `SignupRequest.onboardingPurpose`(BE 없음, 미전송) · `GoalResponse.suggested`(BE 없음, 미사용) · `StepCompleteResponse` 에 BE의 `executed_date·next_action_seq·already_applied` 누락 · `XrayResponse` 에 BE의 `is_sample_data`·`concentration.threshold_source` 누락 | 후속 이슈 필요 (타입 재동기화 시 일괄) |
| L2 | `HomeBlockState` 유니온에 제거된 `route_pending` 잔존 (BE #84) | 후속 이슈 필요 (H4와 묶음) |
| L3 | `AdminExtractPreview` 의 `resolved_source_url·fetched_char_count·fetched_text_preview` 를 BE가 아직 안 보냄 | BE 사안 (divurve-api#129) |
| L4 | `AdminRefreshResponse` 신규 필드 `backfilled_days·confirmed_absent_days·complete·coverage` 미표시 | 후속 이슈 필요 (선택) |
| L5 | `GET /stress/scenarios` 는 공개 엔드포인트인데 FE가 `requiresAuth` 기본값(true)으로 호출 | 무해 — 기록만 |
| L6 | `FactorsResponse.from()` 이 `List.of()` 를 반환 — 요인 목록이 **항상 빈 배열**. 전망 화면의 "변동 요인" 섹션이 영구 공란 | BE 사안 (신규) |
| L7 | `types/diagnosis.ts` 의 `ExplanationLevel = simple\|reasoned\|analytical` 이 BE `explain_level`(`simple·standard·detailed`)과 다름. 현재 로컬 저장소 전용이라 무해하지만 `/me/settings` 에 연결하는 순간 어긋난다 | 후속 이슈 필요 |
| L8 | `toCamelCase` 가 **맵 키까지** 변환한다. `fit/preview` 의 `sensitivity_1pct.before/after` 는 통화코드 + `total_krw` 를 키로 갖는 맵이라 `total_krw` 가 `totalKrw` 로 바뀐다. 지금은 아무도 안 읽어 무해하지만, BE 상수(`Sensitivity.TOTAL_KEY = "total_krw"`)로 조회하면 실패한다 | 기록 — 읽게 될 때 주의 |

---

## 4. "관대해서 조용히 어긋나는" 지점

이번 점검의 가장 큰 소득이다. `PairCode.parse()` 와 같은 성격 — **틀려도 예외가 나지 않아
오래 숨는** 구조를 백엔드·프론트 양쪽에서 모두 찾았다.

### 4-1. 백엔드 쪽

| 지점 | 왜 관대한가 | 실제 사고 |
|---|---|---|
| `PairCode.parse()` | `_`·`/` 제거 후 6자리 영문이면 통과. 저장 통화쌍 3종인지는 확인하지 않는다 | (기지) `JPY_KRW`·`EUR_KRW` 가 400 없이 오래 통과 |
| `ExplainRequest.surface` | **검증이 전혀 없는 자유 문자열.** `AiService` 는 `forecast_summary` 만 특별 취급하고 나머지는 `MockAiProvider` 의 범용 템플릿으로 넘긴다 | 지면 이름을 오타 내도 200 + 그럴듯한 문장이 돌아온다. FE의 5개 지면(`forecast_summary`·`home_market_summary`·`xray_exposure`·`xray_fitness`·`planner_plan_summary`) 중 4개는 사실상 검증 없이 통과 중 |
| `POST /ai/explain` 전반 | 실패해도 200 + `fallback:true` (FR-AI-06, 의도된 계약) | HTTP 상태로 판정하면 실패를 못 본다 — FE는 준수 중 |
| `@RequestParam(defaultValue="30") horizon_days` | 값을 **잘못** 보내면 400이지만 **생략**하면 조용히 30 | 홈 시장 카드가 의도적으로 이 동작에 기대고 있다(무해하나 암묵적) |
| `@RequestParam(required=false) size` (`/admin/users`) | 생략 시 서버 기본값. 클라이언트가 페이지 크기를 안다고 착각하기 쉽다 | 현재 FE는 항상 명시 — 무해 |
| `GET /me/risk-profile` | 미측정이어도 404가 아니라 200 + `status:"not_measured"` | FE의 404 방어 코드가 죽은 분기다(무해) |

### 4-2. 프론트 쪽 — **이번에 발견한 High 불일치 6건이 전부 여기서 나왔다**

| 지점 | 왜 관대한가 | 걸린 곳 |
|---|---|---|
| `request<T>()` 의 `toCamelCase(...) as T` | **런타임 검증이 0이다.** 응답에 필드가 통째로 없어도 `undefined` 가 되어 화면이 조용히 빈칸/`NaN`/falsy 를 그린다. TS는 캐스트라 아무것도 못 잡는다 | H2(계획 5개 필드) · H3(알림 2개 필드) · H4(`routeEnabled`) · M6(`concentration.share`) |
| 라벨 조회 테이블의 `?? fallback` 관용구 | 모르는 코드가 와도 예외 없이 원문/기본 톤으로 흘러나간다. **경고가 영구히 꺼져도 아무도 모른다** | H5(`over` 배지) · H6(`turbulent`) · M3(`vol_stress_*`) · M4(`scheduled`/`due`). 과거의 regime `high`/`extreme` 버그와 정확히 같은 형태 |
| `camelToSnakeKey()` 의 숫자 비대칭 | 요청 변환은 `[A-Z]` 앞에만 `_` 를 넣어 `interval80 → interval80`. 응답 변환은 `interval_80 → interval80`. **왕복이 맞지 않는다** | 지금은 그런 이름의 파라미터/본문 필드가 없어 무사고. 새 필드를 넣을 때 조용히 어긋날 수 있다 |
| `toCamelCase` 가 맵 키까지 변환 | DTO 필드와 **데이터 맵 키**를 구분하지 않는다 | L8 (`total_krw → totalKrw`) |
| 테스트 fixture가 FE가 직접 쓴 값 | `src/test/api-fixtures.ts` 가 FE 타입 기준이라 계약이 어긋나도 테스트는 100% 초록이다 | H2·H3·H4 가 커버리지 100% 상태에서 살아남은 이유 |

> **권고**: `api/client.ts` 경계에 응답 스키마 검증(zod 등)을 넣거나, 최소한 라벨 테이블을
> `Record<string, ...>` 대신 **BE 리터럴 유니온을 키로 하는 완전 매핑**(`Record<Regime, ...>`)으로
> 바꿔 누락을 컴파일 에러로 만들면 이 계열 버그가 통째로 사라진다. AGENTS.md §11 의
> "OpenAPI 기반 타입 자동생성 도입" 결정과 함께 다룰 사안이다.

---

## 5. 확인 완료 — 규칙이 지켜지고 있는 항목

| 점검 항목 | 결과 |
|---|---|
| `data` + `meta` 언래핑 | ✅ `client.ts sendRequest()` 한 곳에서만. `data` 키가 없으면 `INVALID_RESPONSE` 로 던진다. 204는 빈 봉투로 처리 |
| `snake_case → camelCase` 경계 단일화 | ✅ `toCamelCase`/`toSnakeCase` 는 `client.ts` 에만 있다. `screens/**`·`hooks/**`·`components/**` 에 남은 snake_case는 전부 (a) `/ai/explain` 의 `facts` 페이로드 키(계약상 예외) 또는 (b) 서버 Enum 코드 조회 키(`within_threshold`·`vol_calm_usd`·`needs_review`)로, FE 식별자가 아니다 |
| `VITE_API_URL` 단일 경로 | ✅ `resolveApiBaseUrl()` 하나만 읽는다. `src/**` 에 하드코딩된 baseURL 없음. `fetch(` 호출도 `client.ts` 외에는 없음. `.env.example` 에 `VITE_API_URL=http://localhost:8080` |
| `/ai/explain` 200 + `fallback` 계약 | ✅ `hooks/use-ai-explanation.ts` 가 성공 상태에 `explanation`+`verification` 을 함께 실어 화면이 성격을 구분한다. HTTP 상태로 성공 판정하는 곳 없음 |
| `facts` 단위 규칙(0~1, snake_case) | ✅ 네 지면 모두 유지. `xray-presenter.ts` 는 표시용 % 를 `toRatio()` 로 되돌려 싣고, `forecast-presenter.ts`·`home-market.ts` 는 서버 값을 가공 없이 싣는다. `isRawBody: true` 로 키 변환도 꺼져 있다 |
| `pair_code` 표기 | ✅ `USDKRW`·`USDJPY`·`EURUSD` 만 사용. `HOME_MARKET_PAIR_CODES` 와 `FORECAST_PAIRS` 두 상수가 각각 배열로 쥐고 있어 임의 확장이 어렵다 |
| `regime` 리터럴 | ✅ `forecast-presenter.ts REGIME_BADGES` 가 `calm·normal·elevated·stress` 4종을 정확히 매핑. 과거 `high`/`extreme` 버그는 해소됨 |
| 401 복구 | ✅ 토큰 없음/거절 시 `registerSessionRefresher` 로 1회만 갱신 후 재시도. 동시 요청도 `refreshInflight` 로 1회 |
| `api/connectivity.ts` 잔재 | ✅ `grep -rn "connectivity" src` **0건**. 남은 언급은 과거 변경 로그 문서뿐 |
| 계층 방향(AGENTS.md §7.1) | ✅ `api/**` 가 `screens`/`components` 를 import 하지 않는다. `client.ts ↔ auth.ts` 순환은 refresher 주입으로 끊어 뒀다 |

---

## 6. 백엔드에 있으나 프론트가 쓰지 않는 엔드포인트

계약 위반은 아니지만, 화면 기능이 로컬 상태에 머물러 있거나 대체 경로가 필요한 곳을 남긴다.

| 엔드포인트 | 비고 |
|---|---|
| `POST /me/risk-profile/simple`, `POST /me/risk-profile/detail` | **초기 설정 진단 결과가 서버에 저장되지 않는다.** `api/diagnosis-progress-store.ts` 가 `sessionStorage` 에만 쓴다. 세션이 끊기면 진단이 사라지고 `GET /me/risk-profile` 은 계속 `not_measured` 다 |
| `POST /me/onboarding/complete`, `PUT /me` | 온보딩 완료가 서버에 기록되지 않는다 |
| `GET /route/context` | 구현돼 있으나 `api/route.ts` 는 정적 fixture 를 반환한다 |
| `POST /plans/preview`, `POST /goals/{id}/plans`, `POST /plans/{id}/scenarios/preview`, `POST /plans/{id}/apply` | 계획 생성·재계산·적용 경로 전체 미연동. `planner-api-presenter.ts` 가 `unsupportedAreas` 로 명시하고 있다. H7의 "적용" 경로가 여기다 |
| `POST/PUT/DELETE /goals/{id}`, `GET /goals/{id}` | 목표 생성·수정·삭제 미연동 |
| `/holdings`, `/deposits`, `/krw-assets` (각 GET·POST·PUT·DELETE) | 자산 직접 입력 화면 없음. 자산은 계정 생성 시 시드된다 |
| `GET /stress/runs` | 스트레스 실행 이력 화면 없음 |
| `GET /market/regime` | 국면 정보는 `/forecast` 와 응답 `meta.regime` 으로 얻고 있다 |
| `GET /currencies`, `GET /banks/{bank_code}/fx-terms` | 마스터 데이터 미사용 (관리자 콘솔은 `/admin/currencies` 를 쓴다) |
| `GET /admin/fx-rates/gaps`, `POST /admin/fx-rates/backfill` | 관리자 콘솔 미연동. H1의 대체 후보 |
| `GET /health/ping` | 연결 확인 화면 삭제와 함께 미사용 |

---

## 7. 이슈 초안 (등록 전 검토용)

> 아래는 **초안만** 적어 둔 것이다. 실제 이슈 등록은 검토 후 진행한다.

### 초안 A — `fix(planner): 계획 응답 계약을 백엔드 PlanResponse 로 재동기화` (High, H2·H7·M1·M4)

- **배경**: BE `614c216`(divurve-api#85, 2026-09-07)이 계획 API 계약을 교체했으나 FE
  `ActivePlanResponse`·`StepSkipResponse` 는 교체 전 형태다.
- **작업**: `api/generated/divurve-api.ts` 의 `ActivePlanResponse` 를 `PlanResponse`
  (`plan_id·goal_id·version·calculation_meta·goal·summary·steps·warnings·disclaimer`)로 교체.
  `planner-api-presenter.ts` 를 `summary.total_rounds`·`summary.next_action_seq`·`summary.status` 기준으로 수정.
  `StepSkipResponse` 를 미리보기 형태로 교체하고, 문구를 "저장했습니다" → "건너뛰었을 때의 변경안입니다"로
  바꾼 뒤 적용 경로(`/plans/{id}/apply`) 연동 여부를 결정.
  `plan-version-list.tsx STEP_STATUS_LABELS` 에 `scheduled`·`due` 추가, 없는 `pending` 제거.
- **DoD**: 실제 백엔드 응답(또는 백엔드 DTO에서 그대로 옮긴 fixture)으로 테스트가 통과할 것.

### 초안 B — `fix(notifications): 알림 응답 필드명을 백엔드 계약에 맞춘다` (High, H3)

- `NotificationDto` 를 `kind·body·isRead` 로 고치고 `notification-menu.tsx`·`mypage-presenter.ts` 를 따라 수정.
- `kind` 는 `step_due·regime_shift·deadline_near·target_zone·safe_mode·concentration` 리터럴 유니온으로.
- 현재 알림 본문이 항상 빈칸이고 모든 알림이 읽음으로 보인다는 점을 재현 절차로 첨부.

### 초안 C — `fix(home): 제거된 route_enabled 플래그를 걷어낸다` (High, H4·L2)

- BE #84 로 `route_enabled` 와 `route_pending` 이 사라졌다. `HomeSummaryResponse`·`HomeBlockState`
  타입과 `home-presenter.ts:152` 의 `isRouteEnabled` 분기를 제거하고 항상 열린 것으로 처리.
- FE 이슈 #28 의 해당 항목을 이 이슈로 종결.

### 초안 D — `fix(ui): 서버 Enum 어휘 불일치로 꺼져 있는 경고를 되살린다` (High, H5·H6·M3)

- `xray-presenter.ts CONCENTRATION_STATUS_LABELS` → `above_threshold·within_threshold·unknown`,
  `xray-exposure-view.tsx` 의 `status === "over"` → `"above_threshold"`.
- `home-presenter.ts BADGE_LABELS`/`BADGE_TONES` → `normal·caution·turbulent` 3종
  (유령 항목 `calm`·`elevated`·`extreme` 제거), `BADGE_FALLBACK_HEADLINES` 에 `turbulent` 추가.
- `TODAY_HEADLINE_LABELS` 에 `vol_stress_*` 와 `regime_*` 계열 보강.
- **재발 방지**: 이 세 테이블을 `Record<리터럴유니온, T>` 로 바꿔 누락이 컴파일 에러가 되게 한다.

### 초안 E — `feat(forecast): horizon_days 선택지를 7·14·30·60·90·180 으로 넓힌다` (Medium, M2)

- divurve-api#121 이 PR #131 로 머지됐다. `types/forecast.ts FORECAST_HORIZON_DAYS` 확장 + 관련 주석 갱신.

### 초안 F — `fix(admin): AI 설명 결과에 실제 verification 필드를 표시한다` (Medium, M5)

- `Explanation` 에서 BE가 주지 않는 `sentenceCount·explainLevel·explainDomain` 제거,
  `verification` 에 `regimeDisclosed`·`fallbackReason` 추가 후 관리자 화면에 노출.

### 초안 G — `fix(xray): fit/preview 의 before/after 집중도를 표시한다` (Medium, M6)

- `FitPreviewResponse.concentration` 타입을 `{before, after, threshold}` 로 고치고
  `xray-fitness-view.tsx` 가 가정 전후를 나란히 보여 주도록 수정.

### 초안 H (BE) — `divurve-api: GET /admin/fx-rates/status 미구현` (High, H1)

- divurve-api#128 진행 상황 확인 요청. 배포 일정이 없으면 FE에서 해당 줄을 감추거나
  `/admin/fx-rates/gaps` 로 대체할지 협의.

### 초안 I (BE) — `divurve-api: GET /forecast/factors 가 항상 빈 배열을 반환` (Low, L6)

- `FactorsResponse.from()` 이 `List.of()` 를 반환해 전망 화면의 변동 요인 섹션이 영구 공란이다.
  스텁이 의도된 것인지, 구현 일정이 있는지 확인 요청.

### 초안 J — `chore(api): 응답 계약 검증 장치 도입 검토` (재발 방지, §4-2)

- 이번 High 6건이 모두 "런타임 검증 0 + `?? fallback`" 때문에 커버리지 100%인 채로 숨어 있었다.
  `api/client.ts` 경계 스키마 검증(zod 등) 또는 OpenAPI 기반 타입 자동생성(AGENTS.md §11 미정 항목)
  도입을 결정한다. 테스트 fixture를 FE가 직접 쓰지 않고 백엔드 DTO/Swagger에서 파생시키는 것도 함께.

---

## 8. 검증

- `npm run lint` · `npm run build` · `npx vitest run --coverage` — §9 참조(문서만 변경).
- 대조는 코드 정적 분석으로 수행했다. 실제 응답을 받아 본 것이 아니므로, 초안 A~D를 착수할 때
  Swagger UI(`/swagger-ui/index.html`) 또는 로컬 백엔드로 응답 한 건씩 확인하는 것을 권한다.
