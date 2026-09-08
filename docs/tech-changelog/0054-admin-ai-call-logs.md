# 0054. 관리자 콘솔에 AI 호출 로그·사용량 집계 화면을 붙인다

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | Claude (AI Agent) |
| 변경 유형 | feat |
| 영향 범위 | 화면(관리자 콘솔), API(`GET /admin/ai/calls`·`/admin/ai/usage-summary`) |
| 관련 브랜치 | feat/admin-ai-call-logs |
| 관련 커밋 | (PR 머지 후 기입) |
| 관련 이슈·PR | #61, 백엔드 fx-hunters/divurve-api#143 · PR fx-hunters/divurve-api#149 |

## 변경 사유 (Why)

백엔드가 AI 호출 로그를 적재하기 시작했는데(divurve-api#143) 조회 화면이 없어 그 데이터를 볼 방법이 없었다.

지금까지 AI 비용의 근거는 서버 로그 한 줄뿐이었다. `ANTHROPIC_ENABLED=true` 로 실 API 를 켜는 순간
비용이 호출 수와 입력 크기에 그대로 비례하는데, "이번 주 비용이 왜 늘었는가" 에 답할 화면이 없었다.

집계를 위에 두고 행 목록을 아래에 둔 것도 같은 이유다. 행 단위 목록만으로는 추이가 보이지 않는다 —
목록은 집계에서 이상한 날을 찾은 뒤 그 안을 들여다보는 용도다.

## 변경 내용 (What)

- `src/api/admin.ts` — `fetchAdminAiUsageSummary`·`fetchAdminAiCalls` 와 정규화 함수, 어휘 상수
  (`ADMIN_AI_PURPOSES`·`ADMIN_AI_OUTCOMES`) 추가. 기존 `normalizeAdminUserPage` 패턴을 그대로 따랐다
- `admin-ai-calls-screen.tsx`(container) + `admin-ai-usage-summary.tsx`·`admin-ai-call-table.tsx`·
  `admin-ai-call-filters.tsx`(표현) + `admin-ai-call-query.ts`·`admin-ai-call-vocabulary.ts`(순수 함수)
- `admin-routing.ts` — `aiCallLogs` 라우트와 `/admin/ai/calls`, `AI 로그` 메뉴
- 보이스카웃 정리 — `admin-users-screen.tsx` 에 있던 `toIsDemoParam`(→ `admin-demo-filter.ts`)과
  `hasAdminUsersNextPage`(→ `admin-paging.ts` 의 `hasAdminNextPage`)를 두 화면이 공유하도록 뽑았다.
  `AdminTable` 에 헤더 문구만 바꾸는 `header` 옵션을 더했다(기존 동작 그대로)

## 영향 / 리스크

**수치는 만들지 않는다.** 서버가 준 칸을 그대로 세운다 — 합계·비율·비용 금액을 화면에서 만들지 않았다.
비용 금액은 백엔드가 내지 않고(모델별 단가 개정·적용 기준이 팀 결정 사항), 틀린 금액보다 토큰 수만
보여 주는 편이 안전하다는 판단이다.

**시간대가 두 기준으로 섞인다.** 집계 `day` 는 UTC 로 자른 날짜이고, 이 레포의 기존 시각 표기
(`admin-datetime.ts`)는 Asia/Seoul 고정이다. 아무 표기 없이 두면 하루 경계가 9시간 어긋나 집계가
틀려 보이므로 이렇게 나눴다.

| 칸 | 기준 | 표기 |
|---|---|---|
| 집계 `day` | UTC | 헤더에 `day (UTC 기준)`, 서버 문자열 그대로 |
| 조회 기간 `from`·`to` | UTC | 라벨에 `(UTC 기준 날짜)`, 날짜를 `T00:00:00Z`~`T23:59:59.999Z` 로 넓혀 전송 |
| 목록 `requestedAt` | KST | 헤더에 `requestedAt (KST)` |

**null 3종이 정상값이다.** `model: null` 은 LLM 을 부르지 않았다는 뜻이라 `-` 가 아니라
`템플릿 (LLM 미호출)` 로 적는다. `userId: null` 이면 상세 링크를 비활성화한다(그대로 두면 404).
캐시 토큰 2종은 프롬프트 캐싱을 쓰기 전까지 항상 null 이다.

**`outcome` 5종을 미리 넣어 뒀다.** `cache_hit`(divurve-api#139)·`quota_blocked`(#140)는 지금 0건이지만,
그 기능이 켜지는 날 화면이 모르는 값으로 깨지지 않게 표기를 갖춰 두었다. 어휘 밖의 값이 와도 원문을
그대로 보여준다.

**실 API 가 꺼진 상태를 미연결로 오해하지 않게 했다.** 집계가 전부 `model: null` 이면 "토큰 0·비용 0이
정상" 이라는 안내를 띄운다. 기본 설정에서는 이것이 화면 전체의 상태다.

## 검증
- [x] 테스트 통과 + 커버리지 100% — 883 테스트, 라인·브랜치·함수·구문 모두 100%
- [x] `npm run lint` 0 errors (경고 15 → 13, 옮긴 함수만큼 줄었다)
- [x] `npm run build` 성공
- [x] 백엔드 계약 대조 — `AdminAiController`·`AdminAiCallLogResponse`·`AdminAiUsageSummaryResponse`·
      `AiCallLogQueryService` 를 `fx-hunters/divurve-api` develop 에서 직접 읽어 필드·어휘·400 조건을 확인
- [ ] (수치 변경 시) 변경 전후 값 확인 — 해당 없음. 화면이 만드는 수치가 없다

## 롤백 방법
이 커밋을 되돌린다. 새 화면과 새 모듈이라 기존 화면에는 영향이 없고, 함께 뽑아낸
`admin-demo-filter.ts`·`admin-paging.ts` 는 `admin-users-screen.tsx` 안으로 되돌리면 원래 상태가 된다.
