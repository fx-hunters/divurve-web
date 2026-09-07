# 0032. Planner Journey 실제 API 경계와 Curve UI 통합

| 항목 | 내용 |
| --- | --- |
| 날짜 | 2026-09-07 |
| 작성자 | Codex |
| 변경 유형 | feat / ui / refactor |
| 영향 범위 | Planner API / 표시 모델 / 화면 상태 / 접근성 / 테스트 / 문서 |
| 관련 브랜치 | `feat/planner-journey-api` |
| 관련 커밋 | 커밋 전 |
| 관련 이슈·PR | 미지정 |

## 변경 사유 (Why)

회원용 `/route`는 최신 Swagger 계약으로 목표와 활성 계획을 조회하고 회차를
완료하거나 건너뛸 수 있었지만, 원시 API 응답과 표시 계산이 하나의 화면에 섞여
있었다. 목표, 계획, 회차 입력도 카드 형태로 한꺼번에 노출돼 기존 데모 플래너의
Curve 중심 사용자 경험과 달랐다.

최신 API를 데이터 정본으로 유지하면서도 목표 선택 → 현재 상태 → 계획 Curve →
다음 행동 → 계획 상세 순서로 한 가지 판단씩 진행하려면 API 경계, 순수 presenter,
표현 컴포넌트를 분리할 필요가 있었다. 데모의 대체 시나리오는 서버 계약에 없으므로
회원용 API 데이터와 결합하지 않았다.

## 지원 API

| 메서드 | 경로 | 사용 목적 |
| --- | --- | --- |
| `GET` | `/api/v1/goals` | 서버에 등록된 목표 목록 조회 |
| `GET` | `/api/v1/goals/{goalId}/plans/active` | 목표별 활성 계획 조회. `404`는 계획 없음으로 처리 |
| `POST` | `/api/v1/plans/{planId}/steps/{sequence}/complete` | 실행 외화 금액과 실행 환율로 회차 완료 기록 |
| `POST` | `/api/v1/plans/{planId}/steps/{sequence}/skip` | 회차 건너뛰기 기록 |

기존 `api/client.ts`의 인증 헤더, snake_case 변환, 응답 언래핑과 `401` 발생 시
refresh 후 한 번 재요청하는 경계를 그대로 사용한다. 생성 API 타입은 수정하지 않았다.

## 미지원 API와 미구현 기능

- 목표 생성·수정
- 계획 생성·재계산
- 대체 시나리오 또는 분기 계획 생성
- 환율 전망, 미래 환율, 달성 확률 또는 투자 권고 생성
- 서버 응답에 없는 AI 설명 생성

활성 계획이 없으면 목표 정보는 유지하고 “활성 계획이 없습니다” 상태를 보여준다.
동작하지 않는 목표·계획 생성 버튼이나 추측한 endpoint는 추가하지 않았다.

## 데이터 입력과 출력

| 입력 | 출력 |
| --- | --- |
| `GoalResponse` | 목표 선택 항목, 목표명·통화·목표 금액·확보 금액·목표일 |
| `ActivePlanResponse` | 계획 버전·활성 상태·reason·safeRatio·splitCount |
| `PlanStep[]` | 회차 날짜·금액·완료/다음/예정/건너뜀 노드와 다음 행동 |
| 실행 금액·실행 환율 | `StepCompleteRequest`로 전달하고 성공 후 최신 개요 재조회 |
| 계획 ID·회차 번호 | 건너뛰기 경로 변수로 전달하고 성공 후 최신 개요 재조회 |

`PlannerViewModel`은 데이터 출처, 지원 action, 미지원 영역까지 명시한다. 화면은
이 모델의 표시 문자열과 상태만 사용하며 원시 API 응답을 직접 계산하지 않는다.

## 허용한 표시용 파생

- `heldAmount / targetAmount` 진행률을 0~100 범위로 제한한다.
- 분모가 0 이하이거나 금액이 유한수가 아니면 진행률을 0으로 표시한다.
- 활성 계획에서 `completed`, `skipped`가 아닌 첫 회차를 다음 행동으로 찾는다.
- 날짜·금액·비율과 회차 상태를 한국어 표시 문자열로 변환한다.
- Curve path와 노드 좌표는 회차의 순서와 상태만으로 배치한다.

Curve의 높이와 방향은 환율이나 금액의 전망을 뜻하지 않는다. y축, 환율 눈금,
수익 의미를 제공하지 않으며 접근 가능한 설명에서도 “계획 경로”로 구분한다.

## 금지한 금융 계산

- safeRatio, splitCount, 회차 금액의 재계산
- 완료·건너뛰기 응답을 이용한 새 회차 또는 달성 확률 생성
- 환율 변동과 목표 금액을 이용한 추천 시점·대체 경로 생성
- 데모 fixture 수치를 API 응답에 보충하거나 합성

## UI 단계

1. 서버 목표 선택
2. 목표 금액·현재 확보·목표일·표시용 진행률 확인
3. 활성 계획 회차를 연결한 Curve와 노드 확인
4. 다음 회차 완료 또는 건너뛰기
5. 계획 reason, 안전 비율, 분할 회차와 전체 회차 상세 확인

완료와 건너뛰기는 처리 중 중복 제출을 막고, 성공하면 최신 계획을 다시 조회한다.
오류가 나면 서버 메시지를 보존하고 현재 상태를 다시 확인할 수 있다.

## 데모/API 경계

- BE 세션이 데모 계정이면 기존 두 fixture와 대체 시나리오가 있는 데모 Curve를 유지한다.
- 회원 계정이면 서버 응답만 `PlannerViewModel`로 변환한 단계형 Journey를 표시한다.
- API 화면은 데모 fixture를 import하지 않으며 대체 시나리오를 표시하지 않는다.
- 데모와 API의 전체 표현 컴포넌트 통합은 데이터 의미가 다른 영역의 회귀를 막기 위해
  이번 범위에서 강제하지 않았다.

## 영향 / 리스크

- API의 회차 `status`가 알려진 `completed`, `skipped` 외 값이면 다음 미완료 회차
  또는 예정 회차로 표시한다. 서버 enum이 확정되면 명시적 매핑을 동기화해야 한다.
- Curve 좌표는 시각 배치값이며 서버 계획의 금융 의미를 추가하지 않는다.
- 실제 API 환경의 목표·계획 구성과 mutation 권한은 백엔드 세션으로 수동 검수해야 한다.
- 활성 계획 조회 중 `404` 이외 오류는 전체 Planner 오류 상태로 전달한다.

## 검증

- [x] Planner 영향 범위 테스트 통과 — 11개 파일, 98개 테스트
- [x] `npx tsc --noEmit` 통과 — TypeScript 오류 0개
- [x] `npm run lint` 통과 — 오류 0개, 기존 Fast Refresh 경고 11개
- [x] `npm run test` 통과 — 74개 파일, 564개 테스트
- [x] `npm run test -- --coverage` 통과 — statements/branches/functions/lines 100%
- [x] `npm run build` 통과 — 740개 모듈, 기존 500kB 초과 청크 경고 유지
- [x] `git diff --check` 통과 — Windows LF→CRLF 안내만 출력
- [x] 신규 Planner 코드의 리터럴 색상·inline style·명시적 `any` 없음
- [ ] 데스크톱 1440px, 모바일 390px·360px 실제 브라우저 수동 검수

첫 전체 coverage 실행은 신규 Planner 분기의 테스트가 부족해 branches 99.37%,
functions 98.82%로 CI 기준에 실패했다. 구현을 coverage 대상에서 제외하지 않고
입력 경계, 중복 제출, 빈 회차, 노드 fallback, 키보드와 오류 복구 테스트를 추가해
최종 실행에서 네 지표를 모두 100%로 복구했다.

## 롤백 방법

- 신규 Planner ViewModel, presenter, 단계형 API Journey 컴포넌트와 CSS를 한 논리
  단위로 되돌리고 기존 `planner-api-screen.tsx`의 API 목록 화면을 복원한다.
- `src/api/generated/**`, 공통 client, 데모 Route 컴포넌트와 fixture는 변경하지
  않았으므로 별도 롤백하지 않는다.
