# 관리자 콘솔 개편 — BE 계획

| 항목 | 내용 |
|---|---|
| 작성일 | 2026-09-09 |
| 상태 | 초안 |
| 대상 레포 | `divurve-api` |
| 짝 문서 | [FE 계획](./admin-console-overhaul-fe-plan.md) — 이 문서는 FE 계획 §6의 계약 요구를 구현한다 |
| 관련 이슈 | fx-hunters/divurve-api#56 (`audit_logs` — 분리 결정, §7-1-a) · #125 · #128 (관리자 상태 조회, §4-2 대시보드와 인접) |
| 선행 문서 | `divurve-api/CLAUDE.md` §3(패키지)·§4(ArchUnit)·§5(네이밍)·§6(API)·§8(커버리지)·§9.1(병렬 작업) |

---

## 0. 범위

### 하는 것

| 구분 | 내용 |
|---|---|
| **신규 테이블 5개** | 콘텐츠 4 + 감사 로그 1 |
| **공개 API 1개** | `GET /api/v1/contents` (인증 필요, ETag) |
| **관리자 CRUD** | 콘텐츠 4종 + 마스터 4종 |
| **관리자 조회** | 감사 로그, 대시보드 지표 |

### 하지 않는 것

| 구분 | 사유 |
|---|---|
| 사용자 소유 데이터 쓰기 API | FE 계획 §0 — 전 테이블 읽기 전용 |
| 기존 공개 API 변경 | `GET /api/v1/currencies` 등 5필드 계약을 건드리지 않는다 (`AdminCurrencyController` 주석의 기존 판단을 따른다) |
| 계산 로직 변경 | `engine` 모듈은 이번 작업에서 손대지 않는다 |
| 진단 채점 일원화(B) | **별도 이슈.** BE 엔드포인트(`POST /me/risk-profile/simple`)가 이미 있어 BE 작업이 없다. 단 §2-3의 시드 값이 B의 결과에 달려 있다 |

---

## 1. 레포 규약이 강제하는 것

계획을 세우기 전에, 이 레포에서 **선택의 여지가 없는** 항목부터 못박는다.

| 규약 | 이번 작업에 미치는 영향 |
|---|---|
| **ArchUnit 레이어 어노테이션** (§4) | 새 클래스마다 `@WebAdapter`/`@UseCase`/`@PersistenceAdapter` 중 하나를 **반드시** 붙인다. 누락은 리뷰 반려 |
| **`engine`은 Spring·JPA 금지** (§3) | 콘텐츠·감사는 계산이 아니므로 전부 `app/domain` 에 둔다. `engine` 을 건드리지 않는다 |
| **DB 컬럼 = API 응답 필드** (§5) | 응답 필드명을 새로 짓지 않는다. 컬럼명을 그대로 쓰고 축약하지 않는다 |
| **DTO camelCase + Jackson 전역 SNAKE_CASE** (§5) | DTO 는 `camelCase` 로 쓰고 직렬화가 변환한다. 숫자 경계(`[a-z][0-9]`)가 있는 필드는 `@JsonProperty` 고정 — 이번 스키마엔 해당 없음 |
| **`data` + `meta` 래퍼** (§6) | 모든 응답을 `ApiResponse.of(...)` 로 감싼다 |
| **JaCoCo 100%** (§8) | 제외는 `dto`·`entity`·`config`·`port`·`architecture` 뿐이다. **컨트롤러와 서비스는 전부 측정 대상** — MockMvc 테스트가 필수다 |
| **Flyway 번호는 선착순** (§9.1.4) | §2-1 참고. 이 작업의 가장 큰 실무 리스크다 |
| **브랜치 스택 금지** (§9.1.5) | §2-1 참고 |

---

## 2. DB

### 2-1. 마이그레이션은 **한 파일로 묶어 단독 선행 머지**한다

> ⚠️ 이 결정이 이 계획에서 가장 중요하다.

테이블이 5개라고 마이그레이션을 5개로 쪼개면 안 된다. CLAUDE.md §9.1.4·§9.1.5가 기록한 사고가 정확히 그 형상에서 났다 —
`V7` 중복(2026-09-06), `V13`이 배포된 `V14`보다 늦게 도착(2026-09-07, 이슈 #104).

**따라서**:

1. 테이블 5개 + 시드를 **마이그레이션 파일 하나**에 담는다. 서로 순서 의존이 없어 쪼갤 이유가 없다.
2. 이 마이그레이션만 담은 이슈(**BE-1**)를 **가장 먼저 단독으로 `develop` 에 머지**한다.
3. 나머지 BE 이슈는 머지된 `develop` 에서 브랜치를 딴다 → **스키마 변경을 들고 있는 브랜치가 하나도 남지 않는다.**

**번호는 지금 확정하지 않는다.** 현재 `develop` 최대값이 `V27`이라 `V28`이 유력하지만, 번호는 브랜치를 딸 때가 아니라 **머지될 때** 결정된다. 작업 시작 시점과 PR 직전 두 번 확인한다:

```bash
git fetch origin
git ls-tree --name-only origin/develop app/src/main/resources/db/migration/ | sort -V | tail -3
./scripts/check-migration-order.sh origin/develop
```

아래 SQL은 `V28` 을 **가정치**로 쓴다.

### 2-2. `V28__admin_console_content.sql`

```sql
-- 온보딩 투어 스텝 (FE: TOUR_STEPS 6행)
create table onboarding_tour_steps (
    id          uuid        primary key default gen_random_uuid(),
    step_order  smallint    not null,
    target_key  text,                       -- FE data-tour 속성값. null 이면 전체화면 스텝
    nav_tab     text,                       -- 스텝 진입 시 이동할 탭
    title       text        not null,
    description text        not null,
    is_active   boolean     not null default true,
    updated_at  timestamptz not null default now(),
    constraint uq_tour_step_order unique (step_order)
);

-- 진단 문항 (간편 q1~q3 / 상세 q4~q6)
create table diagnosis_questions (
    code         varchar(8)  primary key,   -- q1..q6. BE RiskProfileScorer 와의 계약
    question_set text        not null,
    sort_order   smallint    not null,
    title        text        not null,
    is_active    boolean     not null default true,
    updated_at   timestamptz not null default now(),
    constraint ck_diagnosis_question_set check (question_set in ('simple', 'detail'))
);

-- 진단 선택지. choice_code 가 곧 배점 키다
create table diagnosis_choices (
    question_code varchar(8)  not null references diagnosis_questions (code),
    choice_code   char(1)     not null,
    sort_order    smallint    not null,
    label         text        not null,
    evidence_text text,                     -- 간편 진단 근거문
    phrase_short  text,                     -- 상세 진단 해석 (FE FUND_PHRASES 등)
    phrase_long   text,
    updated_at    timestamptz not null default now(),
    primary key (question_code, choice_code),
    constraint ck_diagnosis_choice_code check (choice_code in ('A', 'B', 'C', 'D'))
);

-- 위험유형 카피. kind 는 BE 열거값과 1:1
create table risk_profile_copy (
    kind            text        primary key,
    display_name    text        not null,
    summary         text        not null,
    sentence_prefix text        not null,
    updated_at      timestamptz not null default now(),
    constraint ck_risk_profile_copy_kind
        check (kind in ('stable', 'balanced', 'aggressive', 'challenging'))
);

-- 관리자 편집 감사 로그
create table admin_audit_logs (
    id            uuid        primary key default gen_random_uuid(),
    admin_user_id uuid        not null references users (id),
    action        text        not null,
    target_table  text        not null,
    target_id     text        not null,
    before_json   jsonb,                    -- create 면 null
    after_json    jsonb,                    -- delete 면 null
    created_at    timestamptz not null default now(),
    constraint ck_admin_audit_action check (action in ('create', 'update', 'delete'))
);
create index idx_admin_audit_created on admin_audit_logs (created_at desc);
create index idx_admin_audit_target  on admin_audit_logs (target_table, target_id, created_at desc);
```

### 2-3. 시드 — FE 상수에서 그대로 옮기되 **두 곳을 BE 기준으로 고친다**

시드 값은 FE의 현재 상수를 옮긴 것이다. 다만 FE 표기를 그대로 쓰면 안 되는 곳이 둘 있다.

| | FE 현재 | **시드에 넣을 값** | 사유 |
|---|---|---|---|
| 문항 코드 | `Q1` ~ `Q6` (대문자) | **`q1` ~ `q6` (소문자)** | `RiskProfileScorer.SIMPLE_QUESTIONS = List.of("q1","q2","q3")`. 대문자로 넣으면 채점이 문항을 못 찾는다 |
| 유형 코드 | `active` / `challenger` | **`aggressive` / `challenging`** | `RiskProfileScorer` 열거값. CHECK 제약이 이미 이 값만 허용한다 |

`risk_profile_copy.display_name` 은 FE에 **두 벌**이 있어 시드 값이 정해지지 않는다:

| kind | `home-presenter.ts` | `diagnosis-presenter.ts` |
|---|---|---|
| `stable` | 안정형 | 안정항로형 |
| `balanced` | 중립형 | 균형항로형 |
| `aggressive` | 공격형 | 적극항로형 |
| `challenging` | 도전형 | 도전항로형 |

**→ 선행 이슈 B 에서 한 벌로 정한 뒤 시드한다** (FE 계획 §9-B). 그전까지 BE-1은 착수하되 `risk_profile_copy` 시드만 비워두고, B 확정 후 `insert` 를 채우는 후속 마이그레이션을 낸다. **다른 4개 테이블은 B와 무관하므로 기다리지 않는다.**

---

## 3. 도메인 레이어 설계

```
app/src/main/java/com/divurve/
  domain/content/
    entity/OnboardingTourStep.java  DiagnosisQuestion.java
          DiagnosisChoice.java      RiskProfileCopy.java
    OnboardingTourStepRepository.java  DiagnosisQuestionRepository.java
    DiagnosisChoiceRepository.java     RiskProfileCopyRepository.java
    ContentQueryService.java        @UseCase   공개 조회 (읽기 전용)
    ContentAdminService.java        @UseCase   관리자 CRUD
    ContentView.java                           도메인 → api 로 넘기는 읽기 모델
  domain/audit/
    entity/AdminAuditLog.java
    AdminAuditRecorder.java         @UseCase   기록 (§7)
    AdminAuditQueryService.java     @UseCase   조회
    AdminAuditLogRepository.java
  domain/master/
    MasterDataService.java (기존)              쓰기 메서드 추가
    MasterAdminService.java         @UseCase   마스터 CRUD (기존 서비스와 분리)
  domain/user/
    AdminMetricsService.java        @UseCase   대시보드 지표
  api/controller/
    ContentController.java              @WebAdapter
    admin/AdminContentController.java   @WebAdapter
    admin/AdminMasterController.java    @WebAdapter
    admin/AdminAuditController.java     @WebAdapter
    admin/AdminMetricsController.java   @WebAdapter
  api/dto/content/ · api/dto/admin/
```

### `@UseCase` 가 `@UseCase` 를 호출해도 되나 — **된다**

`ContentAdminService` 가 `AdminAuditRecorder` 를 부른다. CLAUDE.md §10이 이걸 "미확정"으로 올려뒀지만,
`LayerArchitectureTest` 에는 `.whereLayer("UseCase").mayOnlyBeAccessedByLayers(...)` 규칙이 **없어** 현재 금지되지 않는다.
게다가 `AiCallLogRecorder`(`@UseCase`)를 AI 서비스가 부르는 **기존 선례**가 있다. 같은 패턴을 따른다.

> 나중에 이 규칙이 조여지면 `AdminAuditRecorder` 만 `@PersistenceAdapter` 로 내리면 된다 — 하는 일이 사실상 한 행 저장이라 이동 비용이 낮다.

### 기존 `MasterDataService` 를 확장하지 않고 `MasterAdminService` 를 새로 두는 이유

`MasterDataService` 는 공개 `GET /api/v1/currencies` 와 관리자 조회가 함께 쓴다. 여기에 쓰기 메서드를 얹으면
읽기 전용 트랜잭션과 쓰기가 한 클래스에 섞이고, 공개 경로에서 쓰기 메서드가 보이게 된다. 쓰기는 분리한다.

---

## 4. API 계약

### 4-1. 공개 (인증 필요)

| 메서드 | 경로 | 응답 |
|---|---|---|
| `GET` | `/api/v1/contents` | `data`: 아래 형상 / `meta`: 표준 |

```json
{
  "data": {
    "tour_steps": [
      { "step_order": 1, "target_key": "tour-home", "nav_tab": "home",
        "title": "홈 대시보드", "description": "..." }
    ],
    "diagnosis_questions": [
      { "code": "q1", "question_set": "simple", "sort_order": 1, "title": "...",
        "choices": [
          { "choice_code": "A", "sort_order": 1, "label": "...",
            "evidence_text": "...", "phrase_short": null, "phrase_long": null }
        ] }
    ],
    "risk_profile_copy": [
      { "kind": "stable", "display_name": "...", "summary": "...", "sentence_prefix": "..." }
    ]
  },
  "meta": { ... }
}
```

- **선택지를 문항에 중첩**한다 (FE 계획 §6-1). 화면이 문항 단위로 그리므로 조인 왕복을 없앤다.
- `is_active = false` 인 행은 **응답에서 제외**한다. 관리자만 비활성 행을 본다.
- 정렬은 서버가 끝낸 상태로 준다 (`sort_order`, `step_order`). FE가 다시 정렬하지 않는다.

### 4-2. 관리자

| 메서드 | 경로 | 비고 |
|---|---|---|
| `GET` `POST` `PATCH` `DELETE` | `/api/v1/admin/content/tour-steps`, `/{id}` | |
| `GET` `PATCH` | `/api/v1/admin/content/diagnosis-questions`, `/{code}` | 생성·삭제 없음 |
| `PATCH` | `/api/v1/admin/content/diagnosis-choices/{questionCode}/{choiceCode}` | 텍스트만 |
| `GET` `PATCH` | `/api/v1/admin/content/risk-profile-copy`, `/{kind}` | 생성·삭제 없음 |
| `GET` `PATCH` | `/api/v1/admin/master/currencies`, `/{code}` | 생성·삭제 없음 |
| `GET` `POST` `PATCH` `DELETE` | `/api/v1/admin/master/currency-pairs`, `/{pairCode}` | |
| `GET` `POST` `PATCH` `DELETE` | `/api/v1/admin/master/econ-events`, `/{id}` | `econ_event_pairs` 를 본문에 포함 |
| `GET` `POST` `PATCH` `DELETE` | `/api/v1/admin/master/stress-scenarios`, `/{code}` | |
| `GET` | `/api/v1/admin/audit-logs` | 필터: `admin_user_id`·`target_table`·기간, 페이징 |
| `POST` | `/api/v1/admin/audit-logs/{id}/revert` | 1단계 되돌리기 (§7-3) |
| `GET` | `/api/v1/admin/metrics/summary` | 대시보드 |

모두 `@CurrentAdmin UUID adminId` 를 받는다 (`AdminCurrencyController` 패턴 그대로). 경로 화이트리스트를 두지 않고
`/api/v1/admin/**` 전체가 인가 대상인 기존 방식을 그대로 쓴다.

`GET /api/v1/admin/metrics/summary` 는 **기존 API로 못 채우는 지표만** 담는다 — 가입자 총계·최근 7일/30일 신규·일자별 가입 버킷.
AI 사용량(`/admin/ai/usage`)과 FX 갱신 상태(`/admin/fx-rates/...`)는 이미 있으므로 중복하지 않는다.

---

## 5. 잠금 필드 방어 (FE 요구 ①)

FE의 `isEditable: false` 는 **UI 편의일 뿐이고 서버가 최종 방어선**이다. 방법은 단순하다.

**요청 DTO에 편집 가능한 필드만 둔다.** 잠금 필드는 아예 존재하지 않으므로 보낼 수가 없다.

```java
// api/dto/admin/AdminCurrencyUpdateRequest.java
@JsonIgnoreProperties(ignoreUnknown = false)   // 모르는 키가 오면 400
public record AdminCurrencyUpdateRequest(
        @NotBlank String nameKo,
        @NotBlank String symbol,
        @NotNull Boolean isSupported,
        String supportNote,
        @NotNull @Min(0) @Max(99) Short sortOrder) {
    // minorUnits · quoteUnit · usdSide · isHomeCurrency · colorToken 은 필드 자체가 없다
}
```

전역 `fail-on-unknown-properties` 를 켜지 않는 이유: 기존 엔드포인트 전체의 동작이 바뀐다.
**DTO 단위로만** `@JsonIgnoreProperties(ignoreUnknown = false)` 를 건다.

`diagnosis_questions.code` · `diagnosis_choices.choice_code` 는 요청 본문이 아니라 **경로 변수**로만 받는다 —
본문에 없으니 바꿀 수단이 없다.

---

## 6. 검증 에러 계약 (FE 요구 ②)

FE가 폼에 필드 단위로 붙일 수 있어야 한다.

```json
{ "data": null,
  "meta": { ... },
  "error": { "code": "VALIDATION_FAILED",
             "message": "입력값을 확인해 주세요.",
             "fields": { "sort_order": "0 이상 99 이하여야 합니다." } } }
```

- 키는 **snake_case**(응답 필드 규약, §5). FE가 `api/` 경계에서 camelCase로 바꾼다.
- 문구는 사용자 언어로, **사과 문구 없이** 무엇을 하면 되는지 적는다 (FE AGENTS.md §7.8 / BE 컨벤션 API장).
- 기존 전역 예외 핸들러(`api/config`)에 `MethodArgumentNotValidException` 처리를 더한다. `fields` 맵은 신규 형상이므로 **기존 에러 응답 형태를 깨지 않게** 선택적 필드로 추가한다.

---

## 7. 감사 로그 (FE 요구 ③)

### 7-1. 기록 위치

`ContentAdminService` · `MasterAdminService` 의 각 쓰기 메서드에서 `AdminAuditRecorder.record(...)` 를 호출한다.
저장 전 엔티티를 `Map` 으로 직렬화해 `before_json`, 저장 후를 `after_json` 에 담는다.

### 7-1-a. 이슈 #56(`audit_logs`)과의 관계 — **테이블을 분리한다** (2026-09-09 결정)

열린 이슈 [#56 — AI 감사 기록(audit_logs) 구현]이 ERD §10 기준 `audit_logs` 테이블을 계획하고 있다(현재 미구현 —
마이그레이션·엔티티·기록 코드가 모두 없다). 감사 테이블이 둘이 되는 것은 냄새가 나므로 근거를 남긴다.

| | `audit_logs` (#56) | `admin_audit_logs` (이 문서) |
|---|---|---|
| 대상 | AI 서술 호출 | 관리자의 행 편집 |
| 주체 | 일반 사용자(`user_id`) | 운영자(`admin_user_id`) |
| 내용 | 프롬프트·응답 전문, 검증 결과 | `target_table`·`target_id`·행 diff |
| 실패 정책 | **기록 실패가 AI 응답을 막지 않는다** (NFR-AI-03) | **기록 실패 시 변경도 롤백된다** (§7-2) |

형상도 실패 정책도 정반대라 한 테이블에 담으면 절반이 항상 null 인 컬럼이 생기고 실패 정책이 행마다 달라진다.
**분리하되, #56 에 이 결정을 코멘트로 남겨** 나중에 같은 이름으로 겹치지 않게 한다.

### 7-2. 트랜잭션 정책 — `AiCallLogRecorder` 와 **반대로** 간다

`AiCallLogRecorder` 는 `REQUIRES_NEW` 에 예외를 삼킨다. 그 판단은 옳다 — **AI 비용은 롤백되지 않으므로** 본 트랜잭션이
실패해도 기록은 남아야 한다.

**감사 로그는 정반대다.**

| | `AiCallLogRecorder` | `AdminAuditRecorder` |
|---|---|---|
| 전파 | `REQUIRES_NEW` | **`REQUIRED`** (호출자 트랜잭션에 참여) |
| 예외 | 삼킨다 | **던진다** |
| 사유 | 이미 쓴 비용은 사라지지 않는다 | 롤백된 변경의 감사 기록은 **거짓말**이고, 기록 없는 변경은 감사 로그의 존재 이유를 없앤다 |

즉 **변경과 기록이 함께 커밋되거나 함께 롤백된다.** 기록에 실패하면 변경도 실패해야 한다.

### 7-3. 되돌리기 — 1단계만

`POST /api/v1/admin/audit-logs/{id}/revert` 는 그 로그의 `before_json` 값으로 원래 리소스에 `update` 를 다시 적용한다.

- **되돌리기 자체도 새 감사 로그로 쌓인다** (`action = "update"`). 이력이 선형으로 남는다.
- 이미 다른 변경이 그 위에 쌓였어도 그냥 적용한다 — 낙관적 잠금을 두지 않는다. 관리자가 사실상 1명이고, 충돌 해결 UI 값어치가 없다.
- `action = "create"` 인 로그는 `before_json` 이 null 이므로 되돌리기가 **삭제**가 된다. 이 경우만 확인 다이얼로그를 FE가 띄운다.
- **임의 시점 복원 API는 만들지 않는다** (FE 계획 §10-3).

---

## 8. ETag

FE가 `If-None-Match` 로 재방문 대부분을 304로 끝내려 한다.

**1단계: `ShallowEtagHeaderFilter` 를 `/api/v1/contents` 에만 건다.**

- 코드가 몇 줄이고 정확하다 (본문 MD5).
- 한계를 정직하게 적으면 — **서버는 매번 조회·직렬화를 다 한다.** 절약되는 건 네트워크 대역폭뿐이다.
- 그래도 충분한 이유: 대상이 **투어 6행 + 문항 6행 + 선택지 21행 + 유형 4행 = 37행**이다. 조회 비용이 문제될 규모가 아니다.

**2단계(필요해지면)**: 4개 테이블의 `max(updated_at)` 을 약한 ETag로 쓰고 일치 시 조회 자체를 건너뛴다.
지금 하지 않는 이유는 위와 같다 — 최적화할 비용이 없다.

> `meta` 에 `Instant.now()` 가 들어가면 본문이 매번 달라져 ETag가 절대 일치하지 않는다.
> `GET /contents` 는 `Meta` 의 타임스탬프를 **`max(updated_at)` 으로 고정**해서 준다. 이 한 줄을 빠뜨리면 ETag가 통째로 무력화된다.

---

## 9. 작업 분할

| # | 이슈 | 선행 | FE 대응 |
|---|---|---|---|
| **BE-1** | 마이그레이션 1개(테이블 5 + 시드) — **단독 선행 머지** | — | (없음) |
| **BE-2** | `GET /api/v1/contents` + ETag | BE-1 | FE-4 |
| **BE-3** | 관리자 콘텐츠 CRUD + 감사 기록 | BE-1 | FE-3 |
| **BE-4** | 관리자 마스터 CRUD 4종 + 감사 기록 | BE-1 | FE-2 |
| **BE-5** | 감사 로그 조회 + 되돌리기 | BE-3 또는 BE-4 중 먼저 | FE-7 |
| **BE-6** | 대시보드 지표 API | — | FE-5 |

**착수 순서**

```
BE-1 (단독 머지) ─┬─→ BE-2 ──────────→ FE-4
                  ├─→ BE-3 ─┬─→ BE-5 → FE-7
                  └─→ BE-4 ─┘
BE-6 (독립) ──────────────────────────→ FE-5
```

- **BE-1 이 머지되기 전에는 아무 브랜치도 스키마를 들지 않는다** (§9.1.5).
- **BE-6은 BE-1과 무관**하다. 기존 테이블만 읽으므로 병렬로 먼저 낼 수 있다 — FE-5(대시보드)를 앞으로 당긴 FE 계획과 맞는다.
- 브랜치명은 `feat/{이슈번호}-<scope>` (§9.2). 메인 워크트리가 점유돼 있으면 전용 워크트리를 만든다 (§9.1.1).

---

## 10. 테스트 전략 (JaCoCo 100%)

제외는 `dto`·`entity`·`config`·`port`·`architecture` 뿐이다. **컨트롤러와 서비스는 예외 없이 측정된다.**

| 대상 | 테스트 |
|---|---|
| `ContentQueryService` | 활성/비활성 필터, 정렬, 선택지 중첩, 빈 테이블 |
| `ContentAdminService` · `MasterAdminService` | 각 쓰기 메서드 × (성공 / 없는 id / 검증 실패) |
| `AdminAuditRecorder` | before/after 직렬화, **기록 실패 시 본 변경도 롤백되는지** (§7-2의 핵심 — 여기서 검증한다) |
| 컨트롤러 6종 | MockMvc — 200·400(검증)·401·403·404 |
| **잠금 필드 방어** | 잠금 필드를 본문에 넣어 보내면 **400** 이 나는지. 리소스별 전수 (§5) |
| ETag | 같은 요청 두 번 → 두 번째가 304 인지, `meta` 타임스탬프가 응답을 흔들지 않는지 (§8) |
| 마이그레이션 | 기존 `MigrationVersionTest` + `check-migration-order.sh` 가 자동 적용 |
| ArchUnit | 새 클래스의 어노테이션 누락을 `LayerArchitectureTest` 가 자동으로 잡는다 |

로컬 검증은 `./gradlew ciCheck` (선행: `export DOCKER_API_VERSION=1.44`). **PR 전 최신 `develop` 머지 후** 돌린다 (§9.5 — stale-green 금지).

---

## 11. 리스크

| 리스크 | 대응 |
|---|---|
| Flyway 번호 충돌 | 마이그레이션 1개로 묶고 단독 선행 머지(§2-1). 시작 시점·PR 직전 두 번 확인 |
| `risk_profile_copy` 시드가 B에 묶임 | 그 테이블 시드만 후속 마이그레이션으로 미루고 **나머지 4개는 기다리지 않는다**(§2-3) |
| 시드에 FE 표기(`Q1`·`active`)를 그대로 넣음 | CHECK 제약이 `active`를 막는다. 문항 코드는 제약이 없으므로 **`ContentQueryService` 테스트에서 `q1~q6` 소문자를 단언**한다 |
| ETag가 `meta` 타임스탬프 때문에 무력화 | §8 마지막 문단. 테스트로 고정(§10) |
| 감사 기록 누락 | 쓰기 서비스 메서드마다 기록 호출을 강제 — 리뷰 체크리스트. 자동 강제(AOP)는 이번 범위 밖 |
| 관리자가 `currency_pairs` 를 바꿔 수집이 깨짐 | BE는 막지 않는다(정당한 운영 행위). 감사 로그로 되돌린다 |
| 공개 `GET /currencies` 계약 변경 | 건드리지 않는다(§0). 관리자용은 별도 경로 |

---

## 12. 결정 기록

| # | 질문 | 결정 | 근거 |
|---|---|---|---|
| 1 | 마이그레이션을 테이블별로 쪼갤까 | **한 파일, 단독 선행 머지** | §9.1.4·§9.1.5의 사고 2건 |
| 2 | `@UseCase` → `@UseCase` 호출 | **허용** | `LayerArchitectureTest` 에 금지 규칙 없음 + `AiCallLogRecorder` 선례 |
| 3 | 감사 기록 트랜잭션 | **`REQUIRED` + 예외 전파** | 롤백된 변경의 기록은 거짓말이다 (§7-2) |
| 4 | 잠금 필드 방어 방식 | **요청 DTO에 편집 가능 필드만** | 보낼 수단 자체를 없앤다 (§5) |
| 5 | ETag 구현 | **`ShallowEtagHeaderFilter` 부터** | 37행짜리 페이로드에 최적화할 비용이 없다 (§8) |
| 6 | 대시보드 지표 API 범위 | **기존 API로 못 채우는 것만** | AI 사용량·FX 상태는 이미 있다 |

### 열린 질문

1. `risk_profile_copy.display_name` 을 어느 쪽으로 통일할까 — "안정형/중립형/공격형/도전형" vs "안정항로형/균형항로형/적극항로형/도전항로형"? **기획 결정 필요.** 선행 이슈 B와 이 문서 §2-3이 함께 막혀 있다.
2. `GET /api/v1/contents` 를 `MetaDemoFlagAdvice` 적용 대상에서 뺄까? (`is_demo` 주입이 본문을 흔들면 §8의 ETag가 깨진다 — 구현 시 확인)
