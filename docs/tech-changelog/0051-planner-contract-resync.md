# 0051. 계획 응답 계약을 백엔드 `PlanResponse` 로 재동기화

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | AI Agent (Claude) |
| 변경 유형 | fix |
| 영향 범위 | 화면(플래너) / API 타입 / 테스트 픽스처 |
| 관련 브랜치 | fix/planner-contract-resync |
| 관련 커밋 | (PR 참조) |
| 관련 이슈·PR | #55, 점검 리포트 `docs/api-audit-2026-09.md` H2·H7·M1·M4 |

## 변경 사유 (Why)

divurve-api `614c216`(api#85, 2026-09-07)이 계획 API 응답 계약을 통째로 교체했는데
프론트 `ActivePlanResponse` 는 교체 전 형태 그대로였다. `api/client.ts` 의
`toCamelCase(...) as T` 는 런타임 검증이 없어, 응답에 필드가 아예 없어도 조용히
`undefined` 가 되어 화면이 빈칸·`NaN` 을 그렸다.

**착수 전 실측(2026-09-08).** 리포트의 이 항목만 정적 분석 결과였으므로 실제 응답으로
먼저 확인했다. 데모 계정에는 활성 계획이 없어(`GET /goals/{id}/plans/active` → 404,
`GET /goals/{id}/plans` → `versions: []`) 아무것도 저장하지 않는
`POST /api/v1/plans/preview` 로 실제 구조를 받았다. 응답 최상위 키는
`goal_id · calculation_meta · goal · summary · steps · warnings · disclaimer` 였고
회차 상태는 `scheduled`, 예산 상태는 `CONSTRAINT_ADJUSTMENT_REQUIRED`,
경고는 `["BUDGET_SHORTFALL"]` 였다. **리포트의 주장은 실제 응답과 일치했다.**

실측으로 리포트가 다루지 않은 것도 하나 확인했다 — `PlanResponseMapper` 는 V16 이전에
저장된 계획에 `calculation_meta` 를 만들지 않고 비우고, 저장된 계획 응답의 `warnings`
는 항상 빈 배열이며 `estimated_cost`·`budget_state` 도 없을 수 있다. 그래서 이 세 필드를
선택 필드로 뒀다.

## 변경 내용 (What)

- `api/generated/divurve-api.ts`: `ActivePlanResponse` 를 백엔드 `PlanResponse` 구조로
  교체(`PlanResponse` 로 개명). `PlanCalculationMeta`·`PlanGoalSummary`·`PlanSummary`·
  `PlanCostRange`·`PlanAcquisitionRange` 추가. 상태·예산·경고·조정 선택지를 리터럴
  유니온(`PlanStatusCode`·`PlanStepStatusCode`·`PlanBudgetState`·`PlanWarningCode`·
  `PlanAdjustmentOption`)으로 선언. `StepSkipResponse` 를 미리보기 형태로,
  `StepCompleteResponse` 에 누락돼 있던 `executedDate`·`nextActionSeq`·`alreadyApplied`
  를 추가.
- `screens/route/planner-api-presenter.ts`: 다음 회차 판정을 서버
  `summary.nextActionSeq` 로 옮기고, 계획 요약을 `summary` 값(회차 수·계획 종료일·
  예상 비용 범위·예산 상태·경고·고지 문장)으로 재구성. Curve 노드 id 를 목표 id 기반으로
  바꿔 `undefined-1` 을 없앴다.
- `screens/route/plan-version-list.tsx`: `STEP_STATUS_LABELS` 에서 존재하지 않는
  `pending` 을 빼고 `scheduled`·`due` 를 추가. 라벨 표를 `Record<리터럴유니온, string>`
  으로 선언해 누락이 컴파일 에러가 되게 했다(모르는 코드는 원문 노출).
- `screens/route/use-planner-api.ts`: 건너뛰기 안내를 "서버에 저장했습니다" →
  "건너뛰었을 때의 변경안입니다. 아직 계획에 반영되지 않았습니다"로 바꾸고, 저장된 것이
  없으므로 재조회를 중단. 버튼 문구도 "이번 회차 건너뛰기 미리보기"로.
- `screens/route/planner-plan-facts.ts`: `/ai/explain` 근거 수치에서 서버가 주지 않는
  `safe_ratio`·`split_count` 를 빼고 `summary` 값으로 교체.
- `test/api-fixtures.ts`: 계획 픽스처를 실제 응답과 백엔드 DTO에서 그대로 옮겨 작성.

## 영향 / 리스크

| 화면 | 변경 전 | 변경 후 |
|---|---|---|
| 다음 회차 카드 | `isActive` 가 `undefined` 라 **절대 표시되지 않음** | `summary.nextActionSeq` 회차를 표시 |
| 안전 비율 | `NaN%` | 항목 제거 — 서버가 주지 않는 값이다 |
| 분할 회차 | `undefined회` | 전체·완료·건너뛴 회차(서버 `summary`) |
| 회차 상태 라벨 | `scheduled`·`due` 원문 노출 | "예정"·"예정일 도래" |
| Curve 노드 key | `undefined-1` | `{goalId}-1` |
| 건너뛰기 안내 | "서버에 저장했습니다" | 미리보기임을 명시 + 재분배 수치 |

**적용 경로(`POST /plans/{id}/apply`)는 연동하지 않았다.** 백엔드 계약상 apply 는
`POST /plans/{id}/scenarios/preview` 가 만든 **draft 계획**(`draft_plan_id`)을 승격하는
경로다. 건너뛰기 응답 `StepSkipResponse` 에는 계획 id 자체가 없어 apply 로 넘길 대상이
없다. 즉 건너뛰기만 따로 적용할 수 있는 경로는 백엔드에 존재하지 않는다. 그래서 이번에는
"미리보기"라는 사실을 문구·버튼·`unsupportedAreas`("회차 건너뛰기 적용")에 드러내는 데
그쳤고, 시나리오 미리보기 → 적용은 별도 이슈로 남긴다.

새 값이 담기지 않는 필드는 지어내지 않고 "서버 값 없음"·"미설정"으로 표시한다.

## 검증

- [x] `npm run lint` / `npm run build`(tsc + vite) / `npx vitest run --coverage` 통과,
      커버리지 100%
- [x] 실제 응답 실측 — `POST /api/v1/plans/preview`(데모 계정, 저장 없음)로 구조 확인
- [x] `NaN`·`undefined` 문자열이 ViewModel 직렬화에 나오지 않는지 테스트로 고정

## 롤백 방법

이 커밋을 revert 하면 이전 타입·문구로 돌아간다. 다만 되돌리는 즉시 다음 회차 카드
미표시와 안전비율 `NaN%` 가 함께 돌아온다 — 백엔드 계약은 이미 바뀌었으므로 부분
롤백보다는 문제 지점만 수정하는 편이 안전하다.
