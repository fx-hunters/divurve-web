# 기술적 변경 로그 (Technical Change Log)

단위적·기능적 변경이 생길 때마다 **변경 사유를 문서로 남겨 추적**하는 공간입니다.
"무엇을 바꿨는지"는 diff가 말해주므로, 여기서는 **왜 바꿨는지(Why)** 와 그 영향·검증·롤백을 기록합니다.

## 언제 작성하나

작성 대상 (하나라도 해당하면 작성):
- 기능 추가·변경·제거 (`feat`)
- 버그 수정 (`fix`)
- 계산/수치에 영향을 주는 변경 (`calc`)
- 동작이 바뀌는 리팩터링, API 계약·데이터 형태 변경
- 빌드·CI·아키텍처 등 구조적 변경 (`chore` 중 영향이 있는 것)

작성 생략 가능:
- 오탈자·주석·포맷팅 등 동작에 영향 없는 순수 문서/스타일 변경

## 작성 방법

1. [`TEMPLATE.md`](./TEMPLATE.md)를 복사한다.
2. 파일명은 `NNNN-<kebab-슬러그>.md` (4자리 순번, 예: `0002-add-goal-form.md`).
3. 관련 브랜치/커밋/이슈·PR을 링크한다.
4. PR 본문에서 이 로그 파일을 참조한다.

한 논리적 변경 = 한 파일. 여러 커밋에 걸쳐도 사유가 하나면 파일 하나로 묶습니다.

## 목록

| 번호 | 제목 | 날짜 |
|---|---|---|
| [0001](./0001-introduce-technical-change-log.md) | 기술적 변경 로그 체계 도입 | 2026-09-05 |
| [0002](./0002-clean-code-architecture-principles.md) | 클린 코드·아키텍처 설계 원칙 섹션 추가 | 2026-09-05 |
| [0003](./0003-rename-service-to-divurve.md) | 서비스명 FxAtlas → Divurve 리브랜딩 | 2026-09-05 |
| [0004](./0004-connectivity-check-test-page.md) | 프론트·DB 연동 확인용 테스트 페이지 | 2026-09-05 |
| [0005](./0005-responsive-layout-and-home-screen.md) | 반응형 공통 레이아웃 및 홈 대시보드 | 2026-09-05 |
| [0006](./0006-route-planner-screen.md) | Curve 중심 사용자용 플래너 프로토타입 | 2026-09-06 |
| [0007](./0007-xray-currency-analysis-screen.md) | 내 자산 통화 노출 및 적합도 분석 화면 | 2026-09-05 |
| [0008](./0008-forecast-exchange-range-screen.md) | 환율 범위 팬 차트 및 전망 화면 | 2026-09-05 |
| [0009](./0009-mypage-user-settings-and-routing.md) | 마이페이지 사용자 설정 및 전역 라우팅 점검 | 2026-09-05 |
| [0010](./0010-smooth-bar-in-out-animations.md) | 인디케이터·진행률 바 모션 개선 | 2026-09-06 |
| [0011](./0011-complete-ui-interaction-and-animation-spec.md) | 차트 진입 애니메이션 및 UI 인터랙션 명세 | 2026-09-06 |
| [0012](./0012-fan-chart-tooltip-visibility-enhancement.md) | 팬 차트 툴팁 가시성 개선 | 2026-09-06 |
| [0013](./0013-implement-landing-page.md) | DIVURVE 랜딩 페이지 및 온보딩 진입 | 2026-09-06 |
| [0014](./0014-implement-onboarding-tour.md) | 온보딩 투어 가이드 및 대시보드 연동 | 2026-09-06 |
| [0015](./0015-implement-auth-page.md) | 인증 페이지 및 랜딩·앱 연동 | 2026-09-06 |
| [0016](./0016-mypage-login-logout-support.md) | 마이페이지 로그인·로그아웃 상태 분기 | 2026-09-06 |
| [0017](./0017-donut-chart-timed-fade-in.md) | 도넛 차트 중앙 숫자 페이드 인 | 2026-09-06 |
| [0018](./0018-onboarding-tour-reactivation-and-dormant-logic.md) | 온보딩 재노출 및 다시보기 | 2026-09-06 |
| [0019](./0019-fix-responsive-ui-and-deduplicate-theme-button.md) | 반응형 UI 개선 및 테마 버튼 중복 제거 | 2026-09-06 |
| [0020](./0020-connect-swagger-api.md) | Swagger API 경계 및 실데이터 화면 연동 | 2026-09-07 |
| [0021](./0021-post-auth-initial-setup-shell.md) | 로그인 후 초기 설정 UI 골격 | 2026-09-07 |
| [0022](./0022-decouple-route-loader-from-demo-flag.md) | Route 로더에서 데모 분기 결합 제거 | 2026-09-07 |
| [0023](./0023-be-driven-demo-session.md) | 데모 여부 판단을 BE 세션으로 이관 | 2026-09-07 |
| [0024](./0024-resync-api-contract.md) | 생성 API 타입을 실제 배포 계약과 재동기화 | 2026-09-07 |
| [0025](./0025-mypage-api-integration.md) | 마이페이지를 실제 API 데이터로 통합 | 2026-09-07 |
| [0026](./0026-forecast-api-integration.md) | 환율 범위 탭을 실제 API 데이터로 통합 | 2026-09-07 |
| [0027](./0027-xray-api-integration.md) | 내 자산(X-Ray) 탭을 실제 API 데이터로 통합 | 2026-09-07 |
| [0028](./0028-home-api-integration.md) | 홈 탭을 실제 API 데이터로 통합 | 2026-09-07 |
| [0029](./0029-fix-sensitivity-key-casing.md) | 숫자 경계 응답 키 표기 교정 | 2026-09-07 |
| [0030](./0030-session-expiry-and-401-recovery.md) | 세션 만료 판정과 401 자동 복구 | 2026-09-07 |
| [0031](./0031-initial-setup-diagnosis-flow.md) | 초기 설정·위험성향 진단 UX와 결과 구조 구현 | 2026-09-07 |
| [0032](./0032-planner-journey-api-integration.md) | Planner Journey 실제 API 경계와 Curve UI 통합 | 2026-09-07 |
| [0066](./0066-planner-develop-integration-and-preview-state.md) | 최신 develop 통합과 Planner preview 상태 분리 | 2026-09-08 |
| [0067](./0067-planner-ux-unification.md) | API·데모 Planner Journey UI 통합 | 2026-09-09 |
| [0076](./0076-partial-loading-placeholders.md) | 전체 화면 로딩을 없애고 값 자리에만 자리표시자를 둔다 | 2026-09-09 |
