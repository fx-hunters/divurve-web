# 환전 플래너 계획 생성 — BE 계획

| 항목 | 내용 |
|---|---|
| 작성일 | 2026-09-09 |
| 상태 | 초안 |
| 대상 레포 | `divurve-api` |
| 요청 레포 | `divurve-web` — 이 문서는 FE가 입력받는 값이 백엔드 계산에 닿게 하는 데 필요한 변경만 적는다 |
| 관련 이슈 | fx-hunters/divurve-web#111 |
| 대조 기준 | `divurve-api` `develop` @ `bf424a9` (2026-09-09 확인) |

---

## 0. 범위

### 하는 것

| 구분 | 내용 |
|---|---|
| **입력 계약 보강** | `GoalCreateRequest`·`GoalUpdateRequest`에 계산이 이미 읽고 있으나 받을 길이 없는 필드 5개를 더한다 |
| **저장 경로 연결** | `GoalService.create`가 그 필드를 `Goal` 엔티티에 실제로 넣게 한다 |
| **기본값 규칙** | 우선 조건과 준비 주기의 유형별 기본값을 서버에서 정한다 |

### 하지 않는 것

| 구분 | 사유 |
|---|---|
| 계산식 변경 | `engine/planner`의 균등 회차·비용 범위 모델은 그대로 둔다. 정책 버전 `plan-2026.09.1-equal-split`을 올릴 이유가 없다 |
| 신규 엔드포인트 | `PlanController`의 8개, `GoalController`의 5개로 충분하다. 프론트가 아직 절반만 쓰고 있을 뿐이다 |
| 새 테이블 | 필요한 컬럼이 `goals`에 전부 있다. 마이그레이션은 채우지 않은 컬럼을 채우는 것뿐이다 |
| 응답 계약 변경 | `PlanResponse`는 지금 형태를 유지한다. 프론트 런타임 파서가 이미 이 형태에 맞춰져 있다 |

---

## 1. 프론트가 입력받는 값

`planner-goal-form.tsx`가 화면에서 받고, `planner-goal-input.ts`가 검증해 서버로 넘기는 값이다.

| 화면 항목 | 요청 필드 | 값 | 검증 |
|---|---|---|---|
| 목표 유형 | `kind` | `deadline` / `recurring` | 정기형은 현재 저장 차단 (§2-3) |
| 목표 이름 | `name` | 문자열 | 공백 불가 |
| 통화 | `currency_code` | `USD` / `JPY` / `EUR` | 셋 중 하나 |
| 목적 | `purpose` | `TRAVEL` / `TUITION` / `ONE_TIME_PURCHASE` / `STOCK_ACCUMULATION` | 정기형이면 `STOCK_ACCUMULATION` 고정 |
| 목표 외화 금액 | `target_amount` | 실수 | 0 초과 |
| 목표 날짜 | `target_date` | `YYYY-MM-DD` | 오늘 이후 |
| 반복 주기 | `recur_interval` | `weekly` / `biweekly` / `monthly` | 정기형에서만 의미 |
| 사용 가능 금액 | `budget_amount` | 정수(원) | 0 이상, 정기형은 0 초과 |
| 예산 주기 | `budget_period` | `monthly` 또는 `null` | 금액이 0이면 `null` |

`budget_currency_code`는 `KRW` 고정, `is_speculative`는 `false` 고정으로 함께 보낸다.

### 1-1. 화면에 더해야 할 입력

아래 다섯 개는 백엔드 계산이 이미 읽고 있으나 지금은 아무도 채워 주지 않는다. FE가 폼에 더하고, BE가 받아 저장해야 한다.

| 입력 | 요청 필드 | 유형 | 없으면 벌어지는 일 |
|---|---|---|---|
| 이 목표에 배정할 보유 외화 | `allocated_holding_amount` | 실수, 0 이상 | 남은 금액이 늘 목표 금액 전체가 된다 (§2-1) |
| 준비 주기 | `preferred_cadence` | `weekly` / `biweekly` / `monthly` | 마감형이 항상 주간으로 계산된다 |
| 우선 유지할 조건 | `priority_constraint` | `amount` / `date` / `budget` | 시나리오 재계산이 늘 금액 우선으로 판정한다 |
| 정기형 시작일 | `start_date` | `YYYY-MM-DD` | 정기형 계산에 필수라 저장된 목표로는 계산이 불가능하다 |
| 정기형 점검 기간 | `review_horizon_months` | 정수(개월) | 같음 |

---

## 2. 지금 계약에서 값이 끊기는 지점

> ⚠️ 이 절이 이 문서의 핵심이다. 계산기는 멀쩡한데 입력이 도달하지 못한다.

### 2-1. 배정 보유 외화가 저장 경로에 없다

`PlanInput`은 `allocatedHoldingAmount`를 받고, 마감형 계산은 이 값으로 남은 금액을 만든다.

```
R = max(T − H, 0)        // PlanCalculationService.calculateDeadline
```

값의 출처는 두 갈래다.

| 경로 | 값 | 상태 |
|---|---|---|
| `POST /plans/preview` 본문 | `PlanRequest.allocatedHoldingAmount` | ✅ 받는다 |
| 저장된 목표 | `PlanInput.from(goal)` → `goal.getAllocatedHoldingAmount()` | ❌ 늘 `0.0` |

`GoalCreateRequest`에 필드가 없고, `GoalService.create`의 빌더 호출에도 없다. `Goal` 엔티티에는 컬럼이 있으니 저장할 자리는 이미 있다.

**결과**: 미리보기와 확정 계획의 수치가 갈린다. 사용자가 보유 외화 3,000 USD를 배정해 미리보기를 본 뒤 "이 조건으로 계획 만들기"를 누르면, 저장된 목표로 다시 계산한 계획은 배정을 잊고 회차 금액이 커진다.

### 2-2. 준비 주기와 우선 조건도 같은 형상이다

| 필드 | 엔티티 | 생성 요청 | 실제 값 |
|---|---|---|---|
| `preferredCadence` | 있음 | 없음 | `null` → 마감형 기본 주간 |
| `priorityConstraint` | 있음 (빌더 기본 `amount`) | 없음 | 늘 `amount` |
| `recurStartDate` | 있음 | 없음 | `null` |
| `reviewHorizonMonths` | 있음 | 없음 | `null` |

`PriorityConstraint`의 주석은 기본값이 유형별로 달라야 한다고 적어 두었다. 마감형은 금액과 날짜, 정기형은 예산이다. 빌더 기본값 하나로는 그 규칙을 지킬 수 없다.

### 2-3. 정기형 목표는 저장할 수 없다

`recurStartDate`와 `reviewHorizonMonths`가 `null`로 저장되므로, 저장된 정기형 목표로 `PlanInput.from(goal)`을 만들면 `calculateRecurring`이 `generateForHorizon(null, null, ...)`에서 깨진다. 프론트는 이 사실을 알고 정기형 저장 자체를 막아 두었다.

```ts
// planner-goal-input.ts
"현재 서버 계약에서는 반복형 목표 저장을 지원하지 않습니다."
```

두 필드를 받기 시작하면 이 차단을 걷어낼 수 있다.

---

## 3. 백엔드가 계산해야 하는 것

아래는 **이미 구현된 규칙**이다. 변경 대상이 아니라, FE와 수치를 대조할 때 쓰는 기준으로 적는다.

### 3-1. 마감형 (`kind = deadline`)

| 순서 | 계산 | 산출 |
|---|---|---|
| 1 | `R = max(T − H, 0)` | 남은 외화 금액. `R = 0`이면 회차를 만들지 않고 `TARGET_ALREADY_MET` 경고와 함께 완료로 낸다 |
| 2 | `planEndDate = targetDate − 영업일버퍼` | 버퍼는 목적별로 갈린다. 학비·납부 5영업일, 그 외 3영업일 |
| 3 | 오늘부터 `planEndDate`까지 준비 주기로 회차 날짜 생성 | 회차가 하나도 안 나오면 `target_date` 필드를 지목해 거절한다 |
| 4 | `R`을 회차 수로 균등 분할 | 통화 최소 단위로 정규화한다 |
| 5 | 비용 범위 = 환율 하단·기준·상단에 스프레드와 회차당 수수료 반영 | 수수료는 회차마다 붙으므로 총비용에는 회차 수만큼 곱한다 |
| 6 | `availableBudget = 주기당 예산 × 계획 종료일까지의 주기 수` | 예산 미입력이면 `null`이고 가능 여부를 판정하지 않는다 |
| 7 | 예산 상태 판정 | 하단에도 못 미치면 `BUDGET_SHORTFALL` 경고를 더한다 |

### 3-2. 정기형 (`kind = recurring`)

| 순서 | 계산 | 산출 |
|---|---|---|
| 1 | `startDate`부터 `reviewHorizonMonths`개월 동안 반복 주기로 회차 날짜 생성 | 점검 종료일은 `startDate + 개월` |
| 2 | `netBudget = 회차 예산 − 회차 수수료` | |
| 3 | `netBudget`으로 살 수 있는 외화 범위 (하단·기준·상단) | 정기형은 지출이 고정이고 확보 외화가 범위로 나온다 |
| 4 | 총비용 = 회차 예산 × 회차 수 | 세 값이 모두 같다. 범위가 아니다 |
| 5 | 점검 시점 누적 확보 외화 범위 | 예산 가능 여부는 판정하지 않는다. 예산이 곧 입력이기 때문이다 |

### 3-3. 두 경로에 공통인 제약

- 환율이나 Forecast 데이터가 4일보다 오래되면 계획을 계산하지 않는다.
- Forecast를 얻지 못하면 기준 환율만 쓰고 `FORECAST_UNAVAILABLE` 경고를 남긴다. 값을 지어내지 않는다.
- 미리보기는 저장하지 않는다. 확정은 별도 요청이 받는다.
- 계산에 쓴 정책 버전을 결과와 함께 낸다.

---

## 4. 무엇을 출력해야 하는가

`PlanResponse` 한 형태로 미리보기와 확정 계획을 모두 낸다. 프론트 파서 `parsePlannerPlanResponse`가 이 형태를 그대로 검사한다.

| 블록 | 필드 | 미리보기일 때 |
|---|---|---|
| 식별자 | `plan_id`, `goal_id`, `version` | 셋 다 `null` |
| 계산 근거 | `calculation_meta` — 계산 시각, 환율 기준일, Forecast 기준일, 정책 버전, 통화, 호가 단위, 환율 3점, 스프레드, 수수료 | 채운다 |
| 목표 요약 | `goal` — 유형, 목적, 통화, 목표 금액, 회차 예산, 배정 보유 외화, 남은 금액, 목표일 | 채운다 |
| 계획 요약 | `summary` — 상태, 종료일, 전체·완료·예정·건너뛴 회차, 다음 회차 번호, 비용 범위, 예산 상태, 누적 확보 범위 | 상태는 `draft` |
| 회차 | `steps[]` — 순번, 예정일, 금액, 회차 예산, 비용 범위, 확보 범위, 실행 금액·환율·일자, 상태, 다음 행동 여부 | 실행 필드는 비어 있다 |
| 경고 | `warnings[]` | 코드 문자열 |
| 고지 | `disclaimer` | 문자열 |

`calculation_meta`는 미리보기에서도 반드시 채워야 한다. 프론트가 "이 계획이 쓴 환율"을 화면에 적고, 같은 값이 `GET /route/context`에서도 오는지 대조하기 때문이다.

---

## 5. 백엔드 변경 목록

### BE-1. `GoalCreateRequest`에 필드 5개 추가

```java
public record GoalCreateRequest(
        @NotBlank(message = "목표 이름은 필수입니다.") String name,
        String kind,
        String purpose,
        String currencyCode,
        double targetAmount,
        LocalDate targetDate,
        String recurInterval,
        long budgetAmount,
        String budgetCurrencyCode,
        String budgetPeriod,
        boolean isSpeculative,
        // ── 추가 ──
        double allocatedHoldingAmount,
        String preferredCadence,
        String priorityConstraint,
        LocalDate startDate,
        Integer reviewHorizonMonths) {
}
```

검증은 기존 판단을 따라 `GoalService`에 둔다. 응답 `field`는 스네이크케이스 문자열을 직접 쓴다.

| 필드 | 규칙 | 위반 시 `field` |
|---|---|---|
| `allocated_holding_amount` | 0 이상 | `allocated_holding_amount` |
| `preferred_cadence` | `Cadence`가 아는 코드이거나 `null` | `preferred_cadence` |
| `priority_constraint` | `amount`·`date`·`budget` 중 하나이거나 `null` | `priority_constraint` |
| `start_date` | 정기형이면 필수 | `start_date` |
| `review_horizon_months` | 정기형이면 필수, 1 이상 | `review_horizon_months` |

`allocated_holding_amount`가 `target_amount`를 넘는 경우는 거절하지 않는다. 계산이 `max(T − H, 0)`으로 흡수하고 `TARGET_ALREADY_MET` 경고를 내는 쪽이 사용자에게 더 정확하다.

### BE-2. `GoalService.create`가 그 값을 저장

빌더 호출에 다섯 줄을 더한다. 받지 않은 값의 기본값은 서버가 정한다.

| 필드 | 미입력 기본값 |
|---|---|
| `allocatedHoldingAmount` | `0.0` |
| `preferredCadence` | 마감형 `weekly`, 정기형은 `recurInterval`을 쓴다 |
| `priorityConstraint` | 마감형 `amount`, 정기형 `budget` |

정기형 기본값을 `budget`으로 두는 근거는 `PriorityConstraint` 클래스 주석이다. 지금은 빌더 기본값 하나뿐이라 유형과 무관하게 `amount`가 된다.

### BE-3. `GoalUpdateRequest`에 같은 필드 추가

부분 갱신 계약이므로 전부 `null` 허용을 유지한다. `allocatedHoldingAmount`는 `Double`로 받아야 "0으로 바꿈"과 "변경 없음"이 구분된다. 원시 `double`로 받으면 두 경우가 같아진다.

### BE-4. 정기형 저장 허용 확인

BE-1과 BE-2가 끝나면 `PlanInput.from(goal)`이 정기형에서도 온전한 입력을 만든다. 저장된 정기형 목표로 `POST /goals/{id}/plans`가 통과하는지 통합 테스트로 확인한다. 통과하면 프론트의 정기형 저장 차단을 걷어낸다.

### 우선순위

| 순서 | 항목 | 이유 |
|---|---|---|
| 1 | BE-1 + BE-2 | 미리보기와 확정 계획의 수치가 갈리는 문제를 없앤다. 한 PR로 묶는다 |
| 2 | BE-4 | BE-2에 딸린 검증이다 |
| 3 | BE-3 | 목표 수정 화면이 붙을 때 필요하다 |

---

## 6. 검증 시나리오

BE 변경이 끝났는지 판정하는 기준이다. 전부 수치 대조다.

| # | 절차 | 기대 |
|---|---|---|
| 1 | 배정 보유 외화 3,000을 실어 `POST /plans/preview` → 같은 조건으로 목표 저장 → `POST /goals/{id}/plans` | 두 응답의 `goal.remaining_amount`, 회차 수, 회차 금액이 같다 |
| 2 | 목표 금액과 같은 배정 보유 외화로 미리보기 | 회차 0개, 경고에 `TARGET_ALREADY_MET`, 상태 `completed` |
| 3 | 준비 주기를 `monthly`로 저장한 마감형의 확정 계획 | 회차 간격이 한 달이다. 주간으로 떨어지지 않는다 |
| 4 | 정기형 목표를 시작일과 점검 기간까지 실어 저장 | `POST /goals/{id}/plans`가 200을 낸다 |
| 5 | 우선 조건을 `date`로 저장한 목표에 예산 감소 시나리오 미리보기 | 응답 `priority_constraint`가 `date`다 |
| 6 | `allocated_holding_amount`에 음수 | 400, `field`가 `allocated_holding_amount` |

---

## 7. 미결

- **배정 보유 외화의 상한 검증.** 목표에 배정한 합이 실제 보유 외화를 넘는지 확인할지 정하지 않았다. `GoalCreateRequest` 주석은 보유 외화를 서버가 `/deposits`에서 조회한다고 적어 두었으므로 검증 자체는 가능하다. 다만 넘었을 때 거절할지 경고만 낼지는 제품 결정이다.
- **`purpose` 어휘.** `PlannerPolicy.businessDayBufferFor`의 주석은 `travel/tuition/investment/deposit/custom`을 적고 있는데, 프론트가 보내는 값은 `TRAVEL/TUITION/ONE_TIME_PURCHASE/STOCK_ACCUMULATION`이다. 대소문자 무시 비교라 `TUITION`은 지금도 5영업일을 받지만, 두 어휘 목록이 다른 것 자체는 네이밍 규칙 통일 문서에서 정리해야 한다.
준비 주기 선택지는 미결이 아니다. `Cadence`는 `weekly`·`biweekly`·`monthly` 셋만 알고 대소문자를 가리지 않으므로, 프론트 폼의 선택지와 정확히 일치한다.
