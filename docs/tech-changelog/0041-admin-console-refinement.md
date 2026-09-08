# 0041. 관리자 콘솔 표시 개선 — 사용자 컬럼 정리·날짜 포맷·조회 기본값·설명 화면 분할·URL 추출

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | Claude Opus 5 (에이전트) |
| 변경 유형 | ui / refactor |
| 영향 범위 | 화면(`/admin/users`·`/admin/fx-rates`·`/admin/ai/explain`·`/admin/ai/extract`), API 클라이언트 |
| 관련 브랜치 | chore/admin-console-refinement |
| 관련 커밋 | (커밋 후 기입) |
| 관련 이슈·PR | fx-hunters/divurve-web#50, fx-hunters/divurve-api#128, fx-hunters/divurve-api#129 |

## 변경 사유 (Why)

관리자 콘솔은 "서버가 준 값을 가공 없이 그대로 보여준다"는 원칙으로 만들었다(0033). 값의 원본성을
지키자는 판단은 지금도 유효하지만, 운영해 보니 **읽는 비용**이 그 이득을 넘는 지점들이 드러났다.

- 사용자 목록에 컬럼 10개가 전부 서고, 타임스탬프가 ISO 원문(`2026-09-08T05:12:33.412Z`)이라
  계정을 눈으로 찾는 데 시간이 걸렸다.
- 환율 조회의 `from`/`to`가 빈칸으로 시작해 매번 손으로 채워야 했다. 생략하면 서버 기본값이 1년이라
  화면에서 훑기에는 넓었다.
- 수동 갱신 카드에 **마지막 갱신 시각을 알 방법이 없었다.** `refreshedAt`은 버튼을 누른 그 응답에만
  실려 있고 서버 어디에도 저장되지 않아, 화면에 막 들어온 관리자는 버튼을 한 번 눌러 봐야만 알 수 있었다.
- AI 설명 화면은 입력 폼과 결과가 한 열에 세로로 쌓여, 긴 facts JSON을 고치며 결과를 대조하기 어려웠다.
- AI 추출 화면은 `source_url`과 `text`를 둘 다 받는데, **백엔드가 URL을 열어보지 않는다**
  (`ClaudeExtractPrompt`가 프롬프트에 메타 한 줄로 붙일 뿐이고, 시스템 프롬프트는 오히려 원문 밖 참조를
  금지한다). 실제 추출 입력은 `text` 하나뿐이라, 관리자는 URL을 넣어 두고도 본문을 손으로 복사해야 했다.

## 변경 내용 (What)

- `screens/admin/admin-datetime.ts` 신설 — `YY.MM.DD HH:mm` 포맷터와 조회 기간 기본값 계산.
  `admin-value.ts`의 "가공하지 않는다" 계약은 그대로 두고, 날짜 표기를 **컬럼이 골라 쓰는 옵트인**으로 분리했다.
- `/admin/users` — 표시 컬럼을 `lastLoginIp, lastLoginAt, createdAt, isDemo, name, email` 6개로 줄이고
  순서를 고정. 두 타임스탬프에 포맷 적용.
- `/admin/fx-rates` — 진입 시 `to`=오늘, `from`=한 달 전을 채운다. 라벨의 "(생략 시 …)" 문구 제거.
- 수동 갱신 — `GET /api/v1/admin/fx-rates/status`(백엔드 #128)를 읽어 각 카드에 "마지막 갱신" 한 줄을 세운다.
  200줄을 넘겨 있던 `admin-refresh-panel.tsx`를 `admin-fx-refresh-card` / `admin-macro-refresh-card` /
  `admin-last-refresh-line`으로 나눴다(§7.2 보이스카웃).
- `/admin/ai/explain` — 입력 카드(왼쪽)와 결과 카드(오른쪽)를 `.admin-split` 그리드로 1:1 배치.
  결과 렌더링은 `admin-ai-explain-result.tsx`로 분리.
- `/admin/ai/extract` — `source_url`만 있어도 제출 가능하도록 완화(백엔드 #129). 수집 결과
  (`resolvedSourceUrl`·`fetchedCharCount`·`fetchedTextPreview`·`failureReason`)를 응답 타입에 추가.
- `admin-errors.ts`에 `isAdminEndpointMissing` 추가 — 프론트가 백엔드보다 먼저 나갈 때 404를
  붉은 에러 패널이 아니라 조용한 안내로 떨어뜨린다.

## 영향 / 리스크

- **사용자 목록에서 `role`·`sampleDataSeeded`·`id`·`onboardedAt`이 사라진다.** 목록만 보고 ADMIN 계정을
  구분할 수 없고, 샘플 데이터 배지도 보이지 않는다. 네 값 모두 행을 눌러 들어가는 상세 화면에 그대로 있다.
  행 클릭 이동은 컬럼이 아니라 행 객체의 `user.id`를 쓰므로 영향이 없다.
- **환율 조회 기본 기간이 1년 → 1개월로 좁아진다.** 서버 기본값은 그대로이고, 프론트가 항상 두 값을
  채워 보내는 형태로 바뀐 것이다. 더 넓게 보려면 입력란을 직접 넓히면 된다.
- 날짜는 **Asia/Seoul 고정**으로 읽는다. 백엔드 `ExternalDataConfig.SERVICE_ZONE`과 같은 기준이며,
  보는 사람의 OS 시간대에 따라 같은 값이 달리 읽히지 않는다. 읽지 못한 문자열은 서버가 준 그대로 남긴다.
- 백엔드 #128·#129 배포 전 동작: 마지막 갱신은 "서버가 아직 제공하지 않습니다"로 조용히 떨어지고,
  URL만 넣고 추출을 누르면 서버의 기존 `@NotBlank` 400 메시지가 그대로 노출된다. 화면은 깨지지 않는다.
- 수치 변경 없음. 이 변경은 표시 계층에만 닿는다.

## 검증

- [x] 테스트 통과 + 커버리지 100% (`npx vitest run --dir src --coverage`, 106 파일 / 834건)
- [x] `npm run lint` 0 errors, `npm run build` 통과
- [x] 목 API 서버를 띄워 브라우저로 직접 확인
  - `/admin/users` — 헤더가 `lastLoginIp, lastLoginAt, createdAt, isDemo, name, email` 순, 값이
    `26.09.08 14:12` / 미접속 계정은 `-`
  - `/admin/fx-rates` — 진입 시 `to=2026-09-08`(오늘) / `from=2026-08-08`, 마지막 갱신 `26.09.08 09:31`,
    FRED 카드는 "저장하지 않아 서버에 남는 기록이 없습니다"
  - `/admin/ai/explain` — `grid-template-columns: 607px 607px`로 좌우 동일 폭, 375px에서 한 열로 접힘
  - `/admin/ai/extract` — 입력이 없으면 버튼 잠김, URL만 넣으면 활성, 수집 결과·본문 미리보기 렌더
- [x] 수치 변경 없음 — 확인 대상 없음

## 롤백 방법

이 커밋만 되돌리면 된다. 신규 파일(`admin-datetime.ts`, `admin-last-refresh-line.tsx`,
`admin-fx-refresh-card.tsx`, `admin-macro-refresh-card.tsx`, `admin-refresh-card-props.ts`,
`admin-ai-explain-result.tsx`)은 다른 곳에서 참조하지 않으므로 함께 지워도 안전하다.
백엔드 #128·#129와는 계약만 공유하고 배포 순서에 의존하지 않으므로, 프론트만 되돌려도 백엔드는 영향받지 않는다.
