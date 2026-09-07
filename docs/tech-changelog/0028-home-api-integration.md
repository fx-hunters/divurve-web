# 0028. 홈 탭을 실제 API 데이터로 통합

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-07 |
| 작성자 | Claude (Opus 5) |
| 변경 유형 | feat / fix |
| 영향 범위 | 화면(홈) / API 계약 / 타입 |
| 관련 브랜치 | feat/home-api-integration |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | #26 |

## 변경 사유 (Why)

홈 탭은 `isDemo` 분기로 `api/fixtures/home-dashboard.ts`를 렌더하고, 회원 계정에는 별도의 텍스트 요약 화면(`home-api-summary-view.tsx`)을 보여주고 있었다. 데모 데이터 결정 주체를 BE로 옮기는 작업(0023)의 네 번째 도메인이다.

문제는 **`HomeSummaryResponse` 생성 타입이 실제 배포 응답과 필드가 하나도 겹치지 않았다**는 점이다.

| FE 기존 타입 | 실제 배포 응답 |
|---|---|
| `todayAction.heroAmount` | `today.headline_code`, `today.badge` |
| `currencyStatus.totalAssets` | `fx_status.{fx_ratio, top_currency_code, sensitivity_1pct_krw}` |
| `notice.message` | `attention.{regime_badge, upcoming_events[]}` |
| `weeklyChange.summary` | (없음) |
| `marketSummary.summary` | `forecast.{pair_code, current_rate, interval_80}` |
| `referenceTime` | 봉투 `meta.as_of` |

그래서 `hasHomeContent()`가 없는 필드만 검사해 **항상 `false`를 반환**했고, 회원 계정의 홈은 실제로는 언제나 빈 화면으로 떨어지고 있었다.

또한 서버는 데이터가 없는 블록도 생략하지 않고 `blocks[].state`(`filled`·`empty`·`route_pending`·`not_measured`)로만 구분한다. 하위 객체의 존재 여부로 분기하면 안 된다.

## 변경 내용 (What)

- `api/generated/divurve-api.ts`: `HomeSummaryResponse`를 실제 응답 기준으로 전면 재작성. `HomeBlockKey`·`HomeBlockState`·`HomeBlock`·`HomeActiveGoal`·`HomeUpcomingEvent` 신설
- `screens/home/home-presenter.ts` 신규: 응답 + meta → 화면 뷰 데이터 순수 변환
- `use-home-dashboard.ts`: `isDemo` 인자 제거, `hasHomeContent()`를 `blocks[].state` 기준으로 재작성. **loader를 ref로 참조**해 호출자가 인라인 함수를 넘겨도 조회가 반복되지 않게 한다
- `home-dashboard-view.tsx`: 카드 렌더를 `blockStates`로 분기
- `home-screen.tsx`: `isDemo` prop 삭제
- 신규 카드: `today-headline-card.tsx`(오늘의 핵심 + 집중도 판정), `goals-route-card.tsx`(목표 목록 / 경로 계산 준비 중 안내)
- 재작성: `fx-holding-card.tsx`, `attention-banner.tsx`, `market-summary-card.tsx`
- 삭제: `today-action-card.tsx`, `weekly-comparison-card.tsx`, `home-api-summary-view.tsx`, `home-api-format.ts`, `api/fixtures/home-dashboard.ts`, `components/common/sparkline-chart.tsx`

## 영향 / 리스크

### 서버에 대응 데이터가 없어 걷어낸 화면 요소

AGENTS.md §1(계산 로직을 프론트에 재구현하지 않는다)에 따라, 서버가 주지 않는 값을 FE가 만들어 채우는 대신 해당 요소를 제거했다.

| 제거한 요소 | 이유 |
|---|---|
| 오늘의 행동 카드(이번 주 확보액 $580, D-3, 확보율 42%, 남은 회차 2, 환전 완료 기록 버튼) | `today` 블록에는 `headline_code`·`badge`뿐이고 금액·기한·회차 개념이 없다. 회차 기록에 필요한 `planId`/`stepSeq`는 `/goals/{id}/plans/active`로만 얻는데 `route.enabled=false`라 **501**이다 |
| 주간 비교 카드 전체(전주 대비 확보율·평가액·USD 집중도) | 서버 스펙 어디에도 "전주 대비" 개념이 없다 |
| 시장 요약의 스파크라인 | 시계열 배열을 주는 필드가 없다. `SparklineChart` 컴포넌트도 함께 삭제했다 |
| 외화 현황의 통화별 비중 바(USD 75% / JPY 15% / EUR 10%) | `fx_status`에는 `top_currency_code` 하나뿐이다 |
| 어제 대비 %p | 서버는 `day_change_krw`(금액)를 주며 단위가 다르다. 값이 오면 금액 그대로 표시한다 |

빈 자리는 서버가 실제로 주는 것으로 채웠다. **오늘의 핵심**(headline + 국면 배지 + 집중도 판정), **내 목표**(`goals_route`), **주의 필요**(`upcoming_events[]` 목록), **오늘의 시장**(현재가 + 80% 범위).

### 표시 항목 변경

| 위치 | 변경 전 (fixture) | 변경 후 (서버 값) |
|---|---|---|
| 상단 카드 | "오늘의 행동 (이번 주 확보액)" $580 | "오늘의 핵심" — `today.headline_code` 기반 문구 + `badge` |
| 집중도 | (없음) | `profile_fit.{grade, concentration_status}` |
| 외화 비중 | 64% 고정 | `fx_status.fx_ratio` |
| 주의 필요 | 단일 하드코딩 배너("내일 BOJ 금리 결정…") | `attention.upcoming_events[]` 전체 목록 |
| 시장 요약 | 현재가 + 밴드 + 스파크라인 | 현재가 + 80% 범위(`forecast.interval_80`) |

`today.headline_code`는 서버가 코드만 주고 문장을 주지 않는다. 표시 문구는 presenter의 라벨 표에서 붙이고, **모르는 코드가 오면 `badge` 기준의 중립 문구로 물러난다**. 코드 전체 목록은 BE에 요청 대상이다(AGENTS.md §4).

### 남은 제약

`goals_route` 블록은 `route_enabled: false`인 동안 "환전 경로 계산 기능은 아직 서버에서 준비 중입니다" 안내만 렌더한다. 목표 목록·회차 계획은 BE 플래그가 켜져야 표시된다.

## 검증

- `npm run lint` — 오류 0 (경고 10, 기존 `react-refresh` 경고)
- `npm run build` — 성공
- `npm run test -- --coverage` — 60 파일 364 테스트 통과, 라인·분기·함수·구문 커버리지 100%
- 배포 BE 실호출로 확인: 오늘의 핵심("USD 변동성이 평시 범위입니다.", 배지 정상), 집중도(위험성향 중립형 / 기준선 초과), 외화 비중 36%, 1% 변동 시 ±₩54,924, 다가오는 일정 4건, 오늘의 시장 ₩1,359.50 / 80% 범위 1,330.60–1,389.02, 목표 블록의 준비 중 안내

## 롤백

`feat/home-api-integration` 병합 커밋을 revert한다. 삭제한 카드와 `SparklineChart`는 커밋 히스토리에 남아 있으므로, BE가 대응 필드를 추가하면 그대로 되살릴 수 있다.
