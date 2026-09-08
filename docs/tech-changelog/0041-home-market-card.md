# 0041. 홈 '오늘의 시장' 중앙 배치 · 통화쌍 드롭다운 · AI 자연어 설명 연결

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | AI Agent (Claude) |
| 변경 유형 | feat |
| 영향 범위 | 화면(홈), API(홈 화면용 시세 조회 추가) |
| 관련 브랜치 | feat/home-market-card |
| 관련 커밋 | (PR 머지 시 기입) |
| 관련 이슈·PR | #43 |

## 변경 사유 (Why)

홈 요구사항이 "'오늘의 시장' 카드를 중앙에 크게 배치하고 통화쌍을 드롭다운으로 고를 수 있게" 로 바뀌었다. 기존 카드는 홈 요약이 준 통화쌍 하나(`pairLabel`)를 표시만 했고, 다른 통화쌍을 볼 수단이 없었다. 또 다른 카드들과 같은 그리드에 섞여 있어 화면에서 우선순위가 드러나지 않았다.

여기에 공통 요구사항 6번(AI 자연어 설명)의 홈 화면 연결분을 함께 처리했다. 숫자만 있는 카드보다 "지금 이 수치가 무슨 상태인지"를 문장으로 덧붙이는 편이 홈의 첫 화면으로서 읽힌다.

### 통화쌍 조회 API 선택 근거

`GET /api/v1/home/summary`는 **통화쌍 파라미터를 받지 않는다.** 백엔드 `HomeController.getSummary()`의 인자는 `@CurrentUser UUID userId` 하나뿐이고, 응답의 `forecast` 블록도 서버가 고른 통화쌍 하나만 싣는다. 그래서 사용자가 고른 통화쌍의 수치는 `GET /api/v1/forecast?pair_code=...`(`ForecastController.getForecast()`)로 **별개 조회**한다. 지원 통화쌍 `USDKRW · USDJPY · EURUSD`도 이 컨트롤러의 계약을 그대로 따랐고, `horizon_days`는 서버 기본값 30을 쓴다.

기존 `api/forecast.ts`의 `fetchForecastBundle()`은 쓰지 않았다. 이 함수는 `/forecast` 외에 factors·model-performance·events까지 네 번을 한꺼번에 부르는데, 홈 카드에는 현재 환율·80% 범위·regime만 필요해 세 번이 낭비다. 대신 `api/home.ts`에 홈 전용 단건 조회 `fetchHomeMarketSnapshot()`을 뒀다.

## 변경 내용 (What)

- **레이아웃** — `home-dashboard-view.tsx`를 "위쪽 중앙 시장 카드 + 아래 카드 그리드" 구조로 바꾸고 인라인 그리드 스타일을 `home-dashboard.css`로 옮겼다. 모바일 1열, 768px 이상 2열, 주의 필요 배너는 한 줄 전체를 쓴다.
- **통화쌍 드롭다운** — 카드 헤더에 `<select aria-label="통화쌍">`을 붙였다. 선택 상태는 `useHomeMarket` 훅(홈 화면 내부)에 두고 전역 스토어에 올리지 않았다(AGENTS.md §7.5).
- **첫 렌더는 추가 요청 없음** — 홈 요약이 이미 한 통화쌍의 현재 환율·80% 범위를 실어 주므로 같은 값을 받으려고 `/forecast`를 다시 부르지 않는다. 사용자가 통화쌍을 고른 순간부터 조회하고, 그동안은 공용 `Spinner`를 보여준다. 다른 통화쌍을 고른 뒤에는 이전 통화쌍 수치를 화면에 남기지 않는다.
- **AI 설명** — `useAiExplanation({ surface: "home_market_summary", facts })` + `AiExplanation`을 카드 하단에 붙였다. facts는 `pair_code · current_rate · interval_80_lo · interval_80_hi · regime`(있을 때)이며 **모두 서버가 준 값 그대로**다. 수치가 하나도 없으면 `null`을 넘겨 요청 자체를 하지 않는다(빈 facts에 서버가 400을 준다).
- **표시 규칙** — 통화쌍 라벨은 통화 색 고정 배정 토큰(`--usd`·`--jpy`·`--eur`, 그 밖은 `--text-muted`)으로만 칠한다. 표시 통화 기호(₩·¥·$)와 소수 자릿수(EURUSD만 4자리)는 통화쌍에 따라 고른다.
- **컴포넌트 분리** — 조회·상태는 `market-summary-section.tsx`(container), 표현은 `market-summary-card.tsx`, 순수 변환은 `home-market.ts`로 나눴다(§7.2). `home-dashboard-view.tsx`는 완성된 노드를 `marketSlot`으로 받아 자리만 잡는다.

## 영향 / 리스크

- 수치 계산은 없다. 프론트는 서버 값을 포매팅만 하므로 **표시 값 변화 없음**(같은 통화쌍·같은 응답이면 이전과 같은 숫자).
- 통화쌍을 바꿀 때마다 `/api/v1/forecast` 요청이 한 번 더 나간다. 첫 진입에는 추가 요청이 없다.
- `MarketSummaryCard`의 props 계약이 바뀌었다(`data: ForecastSummaryData` → `view: MarketSummaryView` 외). 이 컴포넌트를 쓰는 곳은 홈뿐이라 다른 화면 영향은 없다. `types/home.ts`의 `ForecastSummaryData`는 홈 프레젠터가 계속 만들지만 카드가 더는 소비하지 않는다.
- `screens/home`은 `api/home.ts`에서 **타입만** 정적으로 import하고, 기본 조회 함수는 실제 요청 시점에 꺼낸다. 통화쌍을 바꾸지 않는 렌더에서는 api 모듈을 건드리지 않는다.
- 시각 검증(모바일/태블릿/데스크톱 3개 폭)은 통합 브랜치에서 수행한다. 이 브랜치에서는 CSS 정적 검토 + 배치 구조 테스트로 대신했다.

## 검증

- [x] 테스트 통과 + 커버리지 100% — `npm run lint`(0 errors) · `npm run build` · `npx vitest run --coverage`(101 files / 764 tests, All files 100%)
- [x] (수치 변경 시) 변경 전후 값 확인 — 계산 변경 없음. 포매팅만 통화쌍별로 분기(EURUSD 소수 4자리)
- [ ] 3개 폭 시각 확인 — 통합 브랜치에서 수행

## 롤백 방법

`feat/home-market-card`의 머지 커밋을 revert한다. 카드가 홈 요약의 `forecast` 블록만 표시하던 이전 동작으로 돌아가며, `api/home.ts`의 `fetchHomeMarketSnapshot()`도 함께 사라진다. 백엔드 변경은 없으므로 서버 롤백은 필요 없다.
