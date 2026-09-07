# 0033. 임시 운영자용 관리자 콘솔(`/admin`) 추가

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-07 |
| 작성자 | Claude (AI Agent) |
| 변경 유형 | feat |
| 영향 범위 | 화면 / API / 빌드 |
| 관련 브랜치 | feat/admin-console |
| 관련 커밋 | (PR 병합 시 채움) |
| 관련 이슈·PR | #34 / 백엔드 fx-hunters/divurve-api#111 |

## 변경 사유 (Why)

운영 중 "서버에 실제로 어떤 값이 들어 있는가"를 확인할 수단이 없었다. 계정·도메인 데이터·통화 마스터·환율 적재 상태·AI 파이프라인 동작을 보려면 매번 DB나 curl을 거쳐야 했다.

백엔드가 `/api/v1/admin/**`을 열었으므로(이슈 #111), 이를 **가공 없이 그대로 보여주는 점검 도구**를 프론트에 붙였다. 정식 사용자 기능이 아니므로 화면 완성도보다 "서버 응답을 왜곡 없이 드러내는 것"을 우선했다.

### 왜 이런 형태인가

- **프론트 계산 금지(AGENTS.md 1장)를 이 화면에서는 더 엄격히 적용했다.** 합계·비율·변화율은 물론 숫자 반올림도 하지 않는다. `toLocaleString()`은 소수 3자리에서 반올림해 원본을 잃으므로 쓰지 않고, 정수부만 직접 끊는다. 값이 없으면 만들지 않고 `-`로 둔다.
- **갱신 응답을 통째로 남긴다.** 성공 토스트만 띄우고 본문을 버리면 "정말 갱신됐는가"를 확인할 수 없다. `has_failure`·`failure_reason`은 물론 `total_upserted=0`도 조용히 넘기지 않고 붉게 세운다.
- **`/admin`을 사용자 앱 셸과 분리했다.** 임시 도구가 일반 사용자 내비게이션에 노출되지 않도록, 탭에 끼우지 않고 자체 레이아웃·자체 로그인을 두었다.

## 변경 내용 (What)

- `src/app/root.tsx` 신규 — pathname이 `/admin` 아래면 `AdminApp`, 아니면 기존 `App`. `main.tsx`가 `Root`를 렌더한다.
- `src/api/admin.ts` 신규 — 관리자 API 클라이언트와 응답 정규화(`normalizeAdmin*`).
- `src/api/ai-explain.ts` 신규 — `POST /api/v1/ai/explain`(관리자 전용이 아닌 사용자 API).
- `src/screens/admin/**` 신규 — 셸·로그인·5개 화면(사용자 목록 / 사용자 상세 / 통화 마스터 / 환율·갱신 / AI 설명·추출), 공용 표·패널·값 포매터.
- `src/api/client.ts` 변경 (2군데):
  - 에러 봉투의 `field`를 `ApiError.field`로 전달. 기존 생성자 인자는 그대로라 호출부 영향 없음.
  - `isRawBody` 옵션 추가. 켜면 요청 바디를 snake_case로 바꾸지 않는다. `ai/explain`의 `facts`는 운영자가 직접 적은 JSON이라 키를 손대면 안 된다.

### 인증·인가

관리자 계정은 백엔드가 환경변수(`ADMIN_EMAIL`/`ADMIN_PASSWORD`)로 기동 시 생성·승격한다. 프론트에 가입·승격 화면을 두지 않는다. 인가는 `users.role`을 매 요청 DB에서 읽어 판정하므로, 권한을 거두면 즉시 반영된다.

**403에서 토큰을 갱신하지 않는다.** 갱신해도 권한은 생기지 않는다. `client.ts`는 401에서만 갱신하고, 403은 그대로 던져 `AdminApp`이 세션을 버리고 "관리자 권한이 없는 계정입니다"와 함께 로그인 화면으로 되돌린다.

### 표기 규칙에 대한 결정

요청 사항은 "응답 필드는 snake_case 그대로 쓰라"였으나, AGENTS.md §4(경계에서만 camelCase 변환)를 지키기로 결정했다. 그 결과 사용자 상세 화면의 동적 컬럼 헤더는 서버 필드명이 아니라 camelCase로 보인다(`last_login_ip` → `lastLoginIp`). 원본 필드명이 필요하면 각 화면의 "응답 원문" 패널에서 확인한다.

### 초기 구현을 백엔드 계약에 맞춰 고친 건

작업 시작 시점에 받은 프롬프트가 구버전이라, 백엔드 정본(`divurve-api:docs/07-admin-console-frontend-prompt.md`)·실제 DTO와 여러 곳이 어긋나 있었다. 아래를 실제 계약에 맞춰 고쳤다.

| 항목 | 초기 구현 | 실제 계약 |
|---|---|---|
| 목록 봉투 | `data.users` | `data.items` |
| 데모 필터 | `include_demo` | `is_demo`(생략 시 전체) |
| 목록 컬럼 | 8개 | `role`·`sample_data_seeded`·`onboarded_at` 포함 10개 |
| 상세 도메인 키 | `risk_profiles`(배열) | `risk_profile`(객체 또는 null) |
| 환율 갱신 | `{pair_codes}` 바디 | 바디 없음 + `?lookback_days=14` |
| 거시 갱신 | 바디 없음 | `{series_ids:["DGS10"]}` 필수 |
| 외부 연동 상태 | `GET /admin/external/status` 배지 | 해당 엔드포인트 없음 → 화면 삭제 |
| 추출기 판정 | `extractor === "noop"` | `"NoOpEconEventExtractor"` |
| `impact` | 문자열 | 정수 |

## 영향 / 리스크

- 기존 사용자 화면 동작은 바뀌지 않는다. 진입점이 `App` → `Root`로 한 겹 늘었을 뿐이다.
- **백엔드 의존**: 관리자 API는 `feat/111-admin-console`에 있고 아직 develop 미머지·미배포다. 그 전까지 각 화면은 서버가 준 에러를 그대로 띄운다. `POST /api/v1/ai/explain`만 현재 배포본에서 동작한다.
- 유도 쌍(`is_stored=false`)은 차트 조회 시 400이므로 선택지에서 잠갔다. 통화 마스터 조회가 실패하면 선택지가 비고, 그 사유를 화면에 남긴다.
- `rate_type`은 스키마상 5종이지만 현재 `mid`만 적재된다. 다른 값을 고르면 0건이 정상임을 화면에서 안내한다.
- `last_login_at`/`last_login_ip`는 **마지막 1건**만 저장된다. 접속 이력이 아니며, 화면 문구도 그렇게 적었다.
- FRED 갱신은 저장하지 않는다(연동 점검용). 화면에 명시했다.
- 수치 변경 없음 — 프론트에서 계산하는 값이 없다.

## 검증

- [x] 테스트 통과 + 커버리지 100% (`npm run test -- --coverage`: 90 파일 / 678 테스트, statements·branches·functions·lines 100%)
- [x] `tsc --noEmit` + `vite build` 통과, 린트 에러 0
- [x] 백엔드 `feat/111-admin-console`의 컨트롤러·DTO·마이그레이션과 요청/응답 계약 대조
- [x] (수치 변경 시) 해당 없음
- [ ] 브라우저 수동 확인 — 다른 세션이 개발 서버 포트를 점유해 이번 작업에서는 수행하지 못했다. 화면 렌더는 각 화면의 렌더 테스트로 대신 검증했다.

## 롤백 방법

`src/main.tsx`가 `Root` 대신 `App`을 렌더하도록 되돌리면 `/admin`은 기존 사용자 앱으로 떨어진다. 완전히 되돌리려면 이 브랜치의 커밋을 revert한다. `api/client.ts`의 `field`·`isRawBody`는 기존 동작을 바꾸지 않는 추가라 남겨 두어도 무방하다.
