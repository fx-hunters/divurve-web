# 관리자 콘솔 개편 — FE 계획

| 항목 | 내용 |
|---|---|
| 작성일 | 2026-09-09 |
| 상태 | 초안 (BE 계획의 입력) |
| 대상 | `src/screens/admin/**`, `src/api/admin.ts`, 신규 `src/content/**` |
| 상위 이슈 | fx-hunters/divurve-web#10 — 이 문서가 그 이슈가 기다리던 "확정된 스펙"이다 |
| 선행 문서 | AGENTS.md §4·§5·§7·§8·§9·§10 |

---

## 0. 범위 (확정)

### 하는 것

| 구분 | 내용 |
|---|---|
| **A. 구조화 콘텐츠** | 온보딩 투어, 진단 문항·선택지·근거문, 위험유형 카피 → DB화 + 관리자 편집 |
| **D. 마스터 데이터** | `currencies`, `currency_pairs`, `econ_events`, `econ_event_pairs`, `stress_scenarios` → 관리자 CRUD |
| **조회 확대** | 기존 14개 테이블 조회 + 시각화 |
| **감사 로그** | 편집 이력 기록·조회·되돌리기 |

### 하지 않는 것 (명시적 제외)

| 구분 | 사유 |
|---|---|
| **B. 채점기 이중화 정리** | 별도 이슈로 분리. 선택지 코드를 잠그면 A와 독립적으로 처리 가능 |
| **C. 색상 토큰** | 컨벤션 7.2가 USD·JPY·EUR 색을 고정 배정. `currencies.color_token`은 **조회만**, 편집 잠금 |
| **E. 개발용 픽스처** | `src/api/fixtures/**` 는 상수가 아니라 목업 |
| **F. 정적 UI 문구** | 랜딩·빈 상태·버튼 라벨 등. 마크업과 엮여 있어 문자열만 따로 바뀌는 일이 없고, 바꿀 땐 어차피 배포다. key-value 테이블은 관리자 화면을 불투명한 키 목록으로 만든다 |
| **사용자 소유 데이터 편집** | 전 테이블 읽기 전용 |

---

## 1. 아키텍처 결정

의존성 현황: `react` `react-dom` `recharts` **3개뿐.** 아래 결정은 이 제약을 전제로 한다.

### D1. 라우터 — react-router 도입하지 않고 기존 수제 라우터를 일반화한다

리소스가 늘어도 `AdminRoute` 유니온은 **리소스 수만큼 늘지 않는다.** 리소스를 경로 세그먼트로 받으면 되기 때문이다.

```ts
export type AdminRoute =
  | { readonly kind: "dashboard" }
  | { readonly kind: "users" }
  | { readonly kind: "userDetail"; readonly userId: string }
  | { readonly kind: "resourceList"; readonly resource: AdminResourceName }
  | { readonly kind: "resourceNew";  readonly resource: AdminResourceName }
  | { readonly kind: "resourceEdit"; readonly resource: AdminResourceName; readonly id: string }
  | { readonly kind: "diagnosisEditor" }   // 1:N 중첩이라 전용
  | { readonly kind: "fxRates" }
  | { readonly kind: "fxGaps" }
  | { readonly kind: "aiExplain" }
  | { readonly kind: "aiExtract" }
  | { readonly kind: "aiCallLogs" }
  | { readonly kind: "auditLogs" };
```

리소스 8종이 추가돼도 유니온 항목은 **3개**(`resourceList`/`New`/`Edit`)만 는다. 라이브러리를 들일 이유가 없다.

> **이슈 #37과의 관계 (2026-09-09 결정)**
>
> 열린 이슈 [#37 — 자체 구현 라우팅 4벌을 react-router로 통합]이 앱 전체 관점에서 react-router 도입을 제안하고 있다.
> #37은 관리자 콘솔만이 아니라 `root.tsx`·`use-tab-navigation`·`diagnosis-routing`·`admin-routing` 4벌을 함께 다루며,
> `popstate` 리스너 3중 구독, 경로 정규화 규칙 3가지, 홈 탭 새로고침 시 랜딩이 뜨는 버그, 내비게이션이 `<a href>`가
> 아닌 점 등 이 문서의 범위 밖 문제를 근거로 든다. **#37의 근거는 이 개편으로 약해지지 않고 오히려 강해진다** —
> 자체 라우터 코드는 커버리지 100% 대상이지만 라이브러리 코드는 아니라서, 관리자 라우트가 늘수록 손으로 짠
> 라우터와 그 테스트가 함께 는다.
>
> **팀 결정: D1(자체 라우터 확장)을 유지하고 #37은 별개 트랙으로 진행한다.**
> 그 대가를 기록해 둔다 — #37이 나중에 착수되면 이 개편으로 늘어난 관리자 라우트 3종(`resourceList`/`New`/`Edit`)과
> `resource-registry` 경로 매핑이 마이그레이션 대상에 추가된다. 관리자 라우팅을 `admin-routing.ts` 한 파일에
> 가둬 두면 그 비용이 최소화되므로, **경로 해석 로직을 화면 파일로 흩지 않는다.**

### D2. 서버 상태 — React Query 도입하지 않고 `useAdminRequest`를 확장한다

지난 논의에서 "CRUD가 들어오면 캐시 무효화가 필수"라고 했는데, 관리자 콘솔의 실제 형상을 보고 판단을 조정한다.

- 화면 하나가 리소스 하나만 다룬다 → **교차 무효화가 없다.** "저장 후 그 화면만 재조회"면 충분하다.
- 동시 사용자가 사실상 1명이고 호출 빈도가 낮다 → 캐시의 이득이 작다.
- [use-admin-request.ts](../src/screens/admin/use-admin-request.ts)가 이미 요청 경합(마지막 요청만 반영)과 401·403 처리를 갖고 있다.

**따라서**: `useAdminRequest`에 `useAdminMutation`을 나란히 추가한다. 성공 시 호출자가 넘긴 `onSettled`로 목록을 재조회한다. 의존성 0개, 기존 에러·인증 처리 그대로 재사용.

> AGENTS.md §11의 "상태관리 라이브러리 미확정"은 그대로 둔다. 이 결정은 관리자 콘솔에 한정하며, 사용자 앱의 서버 상태 전략을 확정하지 않는다.

### D3. 폼 검증 — zod 도입하지 않고 리소스 스키마의 필드 정의로 검증한다

검증 규칙이 대부분 DB `CHECK` 제약과 1:1이고(`minor_units between 0 and 4`, `usd_side in (...)`), **최종 판정은 어차피 BE**다. FE 검증은 즉시 피드백용이므로 필수·범위·enum 정도면 충분하다. 서버가 `VALIDATION` 에러를 주면 그대로 폼에 띄운다(AGENTS.md §7.8).

### D4. 차트 — `recharts` 재사용

[admin-fx-rate-chart.tsx](../src/screens/admin/admin-fx-rate-chart.tsx)가 이미 쓰고 있다. 히트맵만 recharts에 마땅한 형상이 없어 CSS Grid + 토큰 색으로 직접 그린다.

### D5. 화면 생성 — 스키마 주도 + 전용 화면 하이브리드

| 방식 | 대상 |
|---|---|
| **스키마 주도** (목록·폼 자동 생성) | `currencies`, `currency_pairs`, `econ_events`, `stress_scenarios`, `onboarding_tour_steps`, `risk_profile_copy` — 6종 |
| **전용 화면** | 진단 문항 편집기(문항:선택지 1:N), 운영 대시보드, FX 결측 히트맵, 사용자 상세, AI 화면 3종 |

순수 스키마 주도로 다 덮으려 하면 중첩 리소스에서 무너진다. 6종을 프레임으로 처리하고 나머지는 손으로 짜는 게 총비용이 낮다.

---

## 2. 디렉터리 구조

```
src/
  screens/admin/
    resources/                        ← 신규: 스키마 주도 프레임
      resource-schema.ts              필드·리소스 타입 정의
      resource-registry.ts            리소스 9종 정의 (단일 진실 원천)
      admin-resource-screen.tsx       목록 화면 (스키마 → AdminTable)
      admin-resource-form.tsx         생성·편집 폼 (스키마 → 입력 위젯)
      admin-field-input.tsx           필드 종류별 입력 위젯
      admin-field-validate.ts         순수 검증 함수
    dashboard/                        ← 신규
      admin-dashboard-screen.tsx
      admin-metric-card.tsx
    diagnosis/                        ← 신규: 전용 편집기
      admin-diagnosis-screen.tsx
      admin-choice-list.tsx
    admin-fx-gap-heatmap.tsx          ← 신규
    admin-audit-logs-screen.tsx       ← 신규
    use-admin-mutation.ts             ← 신규
    (기존 파일 유지)
  content/                            ← 신규: 사용자 앱용 콘텐츠
    content-defaults.ts               빌드타임 기본값 (기존 상수 이전)
    content-types.ts
    content-context.tsx               Provider + useContent()
    use-app-contents.ts               SWR 부트스트랩 훅
  api/
    admin-master.ts                   ← 신규: D 리소스 CRUD
    admin-content.ts                  ← 신규: A 리소스 CRUD
    admin-audit.ts                    ← 신규
    contents.ts                       ← 신규: 사용자 앱 조회 (공개)
```

`api/admin.ts`가 이미 794줄이라 더 붙이지 않고 파일을 가른다.

---

## 3. 리소스 스키마 (핵심 설계)

```ts
// resources/resource-schema.ts
export type AdminFieldType =
  | { readonly kind: "text" }
  | { readonly kind: "textarea"; readonly rows: number }
  | { readonly kind: "number"; readonly min?: number; readonly max?: number; readonly step?: number }
  | { readonly kind: "boolean" }
  | { readonly kind: "select"; readonly options: readonly AdminSelectOption[] }
  | { readonly kind: "reference"; readonly resource: AdminResourceName }
  | { readonly kind: "date" };

export interface AdminField {
  readonly name: string;              // camelCase (경계 변환은 api/ 에서만 — §4)
  readonly label: string;
  readonly type: AdminFieldType;
  /** false면 폼에서 읽기 전용으로 그린다. 잠금 사유는 note에 적는다. */
  readonly isEditable: boolean;
  readonly isRequired: boolean;
  readonly isListVisible: boolean;
  /** 잠금 사유 또는 "계산 입력값" 같은 경고. 폼에 그대로 노출한다. */
  readonly note?: string;
}

export interface AdminResource<Row> {
  readonly name: AdminResourceName;
  readonly label: string;
  readonly group: "master" | "content";
  readonly idField: string;
  readonly fields: readonly AdminField[];
  readonly canCreate: boolean;
  readonly canDelete: boolean;
  readonly list: () => Promise<ApiResult<readonly Row[]>>;
  readonly create?: (input: AdminRecord) => Promise<ApiResult<Row>>;
  readonly update?: (id: string, input: AdminRecord) => Promise<ApiResult<Row>>;
  readonly remove?: (id: string) => Promise<ApiResult<void>>;
}
```

**`isEditable`가 지난 논의의 잠금 표를 코드로 옮긴 자리다.** 예:

```ts
// resource-registry.ts (발췌)
export const CURRENCIES_RESOURCE: AdminResource<AdminCurrency> = {
  name: "currencies", label: "통화", group: "master",
  idField: "currencyCode", canCreate: false, canDelete: false,
  fields: [
    { name: "currencyCode", label: "코드", type: { kind: "text" },
      isEditable: false, isRequired: true, isListVisible: true, note: "기본키" },
    { name: "nameKo", label: "한글명", type: { kind: "text" },
      isEditable: true, isRequired: true, isListVisible: true },
    { name: "minorUnits", label: "소수 자릿수", type: { kind: "number", min: 0, max: 4 },
      isEditable: false, isRequired: true, isListVisible: true,
      note: "금액 표기 계산에 쓰인다" },
    { name: "usdSide", label: "USD 기준", type: { kind: "select", options: USD_SIDE_OPTIONS },
      isEditable: false, isRequired: true, isListVisible: true,
      note: "환율 유도 방향. 바꾸면 수집이 깨진다" },
    { name: "colorToken", label: "색 토큰", type: { kind: "text" },
      isEditable: false, isRequired: false, isListVisible: false,
      note: "컨벤션 7.2 고정 배정" },
    // ... isSupported, supportNote, sortOrder 는 isEditable: true
  ],
  list: fetchAdminCurrencies, update: updateAdminCurrency,
};
```

### 리소스 8종 요약

| 리소스 | 그룹 | 생성 | 삭제 | 편집 잠금 필드 |
|---|---|---|---|---|
| `currencies` | master | ✗ | ✗ | `currencyCode`, `minorUnits`, `quoteUnit`, `usdSide`, `isHomeCurrency`, `colorToken` |
| `currency_pairs` | master | ✓ | ✓ | `pairCode` — 저장 시 수집 영향 확인 다이얼로그 |
| `econ_events` | master | ✓ | ✓ | `id` |
| `stress_scenarios` | master | ✓ | ✓ | `scenarioCode` — 충격률 2종은 편집 허용 + "계산 입력값" 배지 |
| `onboarding_tour_steps` | content | ✓ | ✓ | — |
| `risk_profile_copy` | content | ✗ | ✗ | `kind` — BE 열거값과 1:1. **선행 이슈 B 필요**(§9-B) |
| `diagnosis_questions` | content | ✗ | ✗ | `code` — BE `RiskProfileScorer.SIMPLE_QUESTIONS` 계약 |
| `diagnosis_choices` | content | ✗ | ✗ | `choiceCode` — 배점 키 그 자체 |

마지막 두 개는 전용 편집기(§4-3)에서 다루되, 스키마는 같은 레지스트리에 둔다.

---

## 4. 화면 목록

### 4-1. 운영 대시보드 `/admin` (신규)

지표 카드 + 추이 차트. 전부 기존 API로 조달 가능한 것 우선:

| 카드 | 출처 |
|---|---|
| 가입자 수 / 최근 7일 증가 | `GET /admin/users` 메타 |
| AI 호출량·실패율 | `fetchAdminAiUsageSummary` (기존) |
| FX 최종 갱신 시각 / 쌍별 상태 | `fetchAdminRefreshStatus` (기존) |
| FX 결측 건수 | `GET /admin/fx-rates/gaps` (기존) |

**신규 BE가 필요 없는 화면부터 낸다.**

### 4-2. 마스터·콘텐츠 리소스 화면 (스키마 주도, 7종)

경로: `/admin/master/<resource>`, `/admin/content/<resource>`

- 목록: `AdminTable` 재사용, `isListVisible` 필드만 열로
- 편집: 우측 드로어 폼. `isEditable: false` 필드는 회색 읽기 전용 + `note` 표시
- 저장: `useAdminMutation` → 성공 시 목록 재조회 + 토스트
- 삭제: `canDelete`인 리소스만, 확인 다이얼로그

### 4-3. 진단 문항 편집기 `/admin/content/diagnosis` (전용)

좌: 문항 6개(Q1~Q6, 간편/상세 구분) / 우: 선택한 문항의 선택지 목록.

- 문항: `title`만 편집. `code`·순서·추가·삭제 잠금
- 선택지: `label`, `evidenceText`, `phraseShort`, `phraseLong` 편집. `choiceCode` 잠금
- **미리보기 패널**: 편집 중인 문항을 실제 `diagnosis-question-step` 컴포넌트로 렌더

### 4-4. FX 결측 히트맵 `/admin/fx-rates/gaps` (신규)

가로 날짜 × 세로 통화쌍. 셀 색 = 결측/보유/휴장(`fx_rate_absences`). 셀 클릭 → 해당 구간 backfill 트리거. **본 것에서 바로 행동으로 이어지는 시각화**라 우선순위가 높다.

### 4-5. 감사 로그 `/admin/audit` (신규)

관리자·대상 테이블·기간 필터. 행 펼치면 `beforeJson`/`afterJson` 나란히 비교.

**되돌리기는 1단계(직전 값)만 지원한다.** 각 행의 되돌리기 버튼이 `beforeJson` 값으로 `update`를 재호출하고, 그 되돌리기 자체도 새 감사 로그로 쌓인다. 여러 번 누르면 결국 더 과거 값에 도달하므로 임의 시점 복원 UI(버전 타임라인·비교 화면)는 만들지 않는다 — 실제 사용 상황이 "방금 잘못 저장했다"에 몰려 있어 화면 하나를 더 지을 값어치가 없다.

### 4-6. 기존 화면

`users`, `userDetail`, `fxRates`, `aiExplain`, `aiExtract`, `aiCallLogs` — 내비게이션 재편만. 사용자 상세는 이미 9개 도메인(`ADMIN_USER_DATA_DOMAINS`)을 다루고 있어 신규 개발이 거의 없다.

### 내비게이션 재편

```
대시보드 │ 사용자 │ 마스터 ▾ │ 콘텐츠 ▾ │ 환율 ▾ │ AI ▾ │ 감사 로그
                    통화        투어 스텝    시계열     설명
                    통화쌍      진단 문항    결측       추출
                    경제 이벤트  유형 카피              로그
                    스트레스     문구
```

메뉴가 7개에서 넘치므로 `ADMIN_NAV_ITEMS`를 2단(그룹 → 항목)으로 바꾼다.

---

## 5. 콘텐츠 부트스트랩 (사용자 앱 성능)

**목표: 첫 페인트가 네트워크를 기다리지 않는다.**

```
                    ┌─ localStorage 캐시 있음 → 즉시 렌더
초기 렌더 ──────────┤
                    └─ 없음 → content-defaults.ts (빌드타임 기본값)로 즉시 렌더
                                        │
백그라운드 ─── GET /api/v1/contents (If-None-Match) ──┐
                                                      ├─ 200 → 캐시 갱신 + 리렌더
                                                      └─ 304 → 아무것도 안 함
```

### 구현

```ts
// content/content-context.tsx
export function ContentProvider({ children }: { readonly children: ReactNode }) {
  const contents = useAppContents();          // SWR 훅
  // §7.9 jsx-no-constructed-context-values — 값을 메모한다
  const value = useMemo(() => contents, [contents]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
```

- `App` 최상단에 한 번 감싼다 (`app/app.tsx`, `use-session-bootstrap` 옆)
- 소비처는 `useContent()` 하나로 통일

### 소비처 전환 대상

| 현재 | 이후 |
|---|---|
| `TOUR_STEPS` ([OnboardingTour.tsx:17](../src/OnboardingTour.tsx)) | `useContent().tourSteps` |
| `QUICK_DIAGNOSIS_QUESTIONS`, `DETAILED_DIAGNOSIS_QUESTIONS` | `useContent().diagnosisQuestions` |
| `RISK_PROFILE_COPY` ([diagnosis-presenter.ts:52](../src/components/diagnosis/diagnosis-presenter.ts)) | `useContent().riskProfileCopy` |
| `FUND_PHRASES`, `EXPERIENCE_PHRASES`, `EXPLANATION_LEVELS` | `diagnosisChoices` 의 `phraseShort`/`phraseLong` 로 흡수 |

**기존 상수 파일은 지우지 않고 `content/content-defaults.ts`로 옮겨 기본값으로 남긴다.**

### 이 설계가 감수하는 대가 (2개)

1. **관리자 편집이 사용자에게 "다음 로드"에 반영된다.** SWR의 특성. 대상이 문구라 즉시 반영의 값어치가 없다고 판단했다.
2. **기본값과 DB가 두 벌이 된다.** 형태는 §0에서 제외한 B와 같지만 **결과가 다르다** — 카피는 어긋나도 계산이 틀리지 않고, 실제로 어긋난 값이 보이는 건 최초 방문 순간뿐이다(이후 DB가 항상 이긴다). B는 어긋나면 사용자 유형 자체가 달라진다. 그래서 A에는 허용하고 B에는 허용하지 않는다.

---

## 6. BE에 요구하는 계약 (→ BE 계획의 입력)

### 6-1. 사용자 앱 (공개)

| 메서드 | 경로 | 비고 |
|---|---|---|
| `GET` | `/api/v1/contents` | A 전체를 한 번에. **`ETag` 필수.** **인증 필요** — 남은 콘텐츠는 전부 로그인 이후에만 쓰인다(§10-1) |

응답 형상 (`data` 안, camelCase 변환은 FE `api/` 에서):

```json
{ "tour_steps": [...], "diagnosis_questions": [...],
  "risk_profile_copy": [...] }
```

`diagnosis_questions[].choices[]` 로 선택지를 **중첩**해서 준다 — 화면이 문항 단위로 그려서 조인 왕복을 없앤다.

### 6-2. 관리자

| 메서드 | 경로 |
|---|---|
| `GET`/`PATCH` | `/api/v1/admin/master/currencies`, `/{code}` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/v1/admin/master/currency-pairs`, `/econ-events`, `/stress-scenarios` |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/v1/admin/content/tour-steps` |
| `GET`/`PATCH` | `/api/v1/admin/content/diagnosis-questions`, `/diagnosis-choices/{code}`, `/risk-profile-copy/{kind}` |
| `GET` | `/api/v1/admin/audit-logs` (필터: 관리자·테이블·기간) |
| `GET` | `/api/v1/admin/metrics/summary` (대시보드 — 기존 API로 못 채우는 지표만) |

**FE가 BE에 요구하는 것 3가지**

1. **잠금 필드를 서버도 거부할 것.** FE의 `isEditable: false`는 UI 편의일 뿐이고, 서버가 최종 방어선이다.
2. **검증 실패를 `ApiError`의 `VALIDATION` 코드 + 필드별 메시지로 줄 것.** 폼에 필드 단위로 붙인다.
3. **모든 쓰기가 `admin_audit_logs`에 기록될 것.** FE는 기록하지 않는다.

---

## 7. 작업 분할 (이슈 단위)

| # | 이슈 | 선행 | BE 의존 |
|---|---|---|---|
| **B** | 진단 채점 서버 일원화 (§9-B) — **본 개편과 별도 이슈** | — | **없음** (엔드포인트 기존) |
| **FE-1** | 관리자 라우팅 일반화 + 리소스 스키마 프레임 + `useAdminMutation` | — | 없음 |
| **FE-2** | 마스터 데이터 CRUD 화면 4종 | FE-1 | BE 마스터 API |
| **FE-3** | 콘텐츠 CRUD 화면 2종 + 진단 편집기 | FE-1, **B** | BE 콘텐츠 API |
| **FE-4** | 콘텐츠 부트스트랩(SWR·기본값 폴백) + 소비처 전환 | FE-3 | `GET /contents` |
| **FE-5** | 운영 대시보드 | FE-1 | **없음** (기존 API) |
| **FE-6** | FX 결측 히트맵 | FE-1 | **없음** (기존 gaps API) |
| **FE-7** | 감사 로그 화면 | FE-1 | BE 감사 API |

**착수 순서**

```
B ────────────────────────────────┐
                                  ├─→ FE-3 → FE-4
FE-1 ─┬─→ FE-5 ─┐                 │
      ├─→ FE-6 ─┼─→ FE-2 ─────────┘
      └─────────┴─→ FE-7
```

- **B와 FE-1은 서로 독립**이라 동시에 갈 수 있다. B는 사용자 앱, FE-1은 관리자 콘솔이라 파일이 겹치지 않는다.
- **FE-5·FE-6을 앞으로 당기는 이유**: BE 없이 끝나서 "시각화" 요구를 가장 먼저 눈에 보이게 만든다.
- **FE-3이 B를 기다리는 이유**: `risk_profile_copy` 시드 값이 B의 결과에 달려 있다(§9-B).

브랜치: `feat/admin-console-overhaul` 아래 이슈별 `feat/admin-<scope>`.

---

## 8. 테스트 전략 (커버리지 100% 게이트)

| 대상 | 테스트 |
|---|---|
| `admin-field-validate.ts` | 순수 함수 — 필드 종류 × (통과/실패) 전수 |
| `resource-registry.ts` | 리소스 8종 각각의 필드 정의 스냅샷. **잠금 필드가 실수로 열리는 회귀를 여기서 잡는다** |
| `admin-resource-form.tsx` | 잠금 필드가 `readonly`로 렌더되는지, 서버 검증 에러가 필드에 붙는지 |
| `use-admin-mutation.ts` | 성공·실패·401·요청 경합 |
| `use-app-contents.ts` | **캐시 있음 / 없음(기본값) / 200 / 304 / 실패 — 5경로 전부.** 분기가 가장 많이 늘어나는 자리 |
| `content-defaults.ts` | **별도 테스트 불필요.** 함수·분기 0이고 `use-app-contents` 테스트가 폴백 경로로 import한다 |

`vite.config.ts`의 `exclude`는 **건드리지 않는다**(§10-2). 대신 규칙 하나를 지킨다 — **`content-defaults.ts`에는 함수를 두지 않는다.** 함수가 들어가는 순간 `functions` 커버리지가 깨져 게이트에 걸린다. 파생·조회가 필요하면 `content-context.tsx` 쪽에 둔다.

---

## 9. 리스크

| 리스크 | 대응 |
|---|---|
| 진단 선택지 코드가 편집돼 채점이 조용히 깨짐 | `choiceCode`·`code` 를 FE `isEditable: false` + **BE에서도 거부**(§6-2-1) |
| 콘텐츠 API 장애 시 온보딩이 빈 화면 | 빌드타임 기본값 폴백(§5). 네트워크 실패가 화면을 막지 않음 |
| `currency_pairs` 편집이 수집 파이프라인을 깸 | 저장 전 확인 다이얼로그 + 감사 로그로 되돌리기 |
| `stress_scenarios` 충격률 편집이 사용자 결과를 바꿈 | "계산 입력값" 배지 + 감사 로그. 기존 `stress_test_runs`는 실행 시점 값을 이미 자기 행에 복사해 두므로 과거 이력은 불변 |
| `api/admin.ts` 비대화(794줄) | 신규 API를 `admin-master.ts`·`admin-content.ts`·`admin-audit.ts`로 분리(§2) |
| B(채점기 이중화)가 `risk_profile_copy` 설계를 막음 | **별도 이슈로 분리하되 FE-3보다 먼저 착수**(§9-B) |

---

### 9-B. 선행 이슈 B — 진단 채점 서버 일원화

**별도 이슈로 분리하되, FE-3(콘텐츠 CRUD)보다 먼저 착수한다.**

#### 현재 문제

1. 채점기가 FE(`risk-diagnosis.ts`)와 BE(`RiskProfileScorer.java`)에 두 벌이다.
2. 온보딩 진단 결과가 서버에 저장되지 않는다 — FE가 `calculateQuickRiskResult()`로 혼자 계산하고
   `POST /me/risk-profile/simple`을 부르지 않는다. FE에 있는 호출은 `GET /me/risk-profile` 하나뿐이다.
3. 등급 어휘가 FE 안에서만 두 벌이다.

| BE 값 | `home-presenter.ts` `GRADE_LABELS` | `diagnosis-presenter.ts` `RISK_PROFILE_COPY` |
|---|---|---|
| `stable` | 안정형 | 안정항로형 |
| `balanced` | 중립형 | 균형항로형 |
| `aggressive` | 공격형 | 적극항로형 (코드 키도 `active`) |
| `challenging` | 도전형 | 도전항로형 (코드 키도 `challenger`) |

#### 왜 FE-3보다 먼저여야 하나

`risk_profile_copy` 테이블의 기본키가 `kind`다. B를 고치지 않은 채 이 테이블을 만들면 시드 값에 답이 없다 —
`active`/`challenger`를 넣으면 FE 전용 이름을 DB에 굳히고, `aggressive`/`challenging`을 넣으면 번역표
(`SERVER_GRADE_KIND`)를 영구히 남겨야 한다.
**B가 먼저 끝나면 이 질문이 통째로 사라진다.**

#### 작업 내용

- `calculateQuickRiskResult`·`getRiskProfileKind`·`QUICK_CHOICE_SCORES` 삭제
- 온보딩이 `POST /me/risk-profile/simple`을 호출하고 서버 결과를 표시
- `RiskProfileKind`를 BE 리터럴(`stable`/`balanced`/`aggressive`/`challenging`)로 통일, `SERVER_GRADE_KIND` 삭제 (AGENTS.md §4)
- 한글 라벨을 **진단 결과 화면 어휘로 통일**한다 (2026-09-09 기획 결정)

| BE 값 | 채택 | 폐기 |
|---|---|---|
| `stable` | **안정항로형** | ~~안정형~~ |
| `balanced` | **균형항로형** | ~~중립형~~ |
| `aggressive` | **적극항로형** | ~~공격형~~ |
| `challenging` | **도전항로형** | ~~도전형~~ |

  `screens/home/home-presenter.ts` 의 `GRADE_LABELS` 를 폐기하고 `risk_profile_copy.display_name` 하나만 남긴다.

BE 신규 작업 없음(엔드포인트가 이미 있다). 사용자 동작이 바뀌므로 **자체 기술 변경로그**를 남긴다(§10).

---

## 10. 결정 기록

| # | 질문 | 결정 | 근거 |
|---|---|---|---|
| 1 | `GET /api/v1/contents`를 인증 없이 열까 | **인증 건다** | 정적 UI 문구(F)를 범위에서 빼면서 로그인 전 소비처가 사라졌다 |
| 2 | `content-defaults.ts`를 커버리지 `exclude`에 넣을까 | **넣지 않는다** | 함수·분기가 0이고 런타임 폴백으로 실제 import되므로 자연히 100%가 된다. **단 이 파일에 함수를 두지 않는다** |
| 3 | 감사 로그 되돌리기 범위 | **1단계(직전 값)만** | §4-5 |
| 4 | B(채점기 이중화) 처리 시점 | **별도 이슈로 분리, FE-3보다 먼저** | §9-B |
| 5 | 위험유형 한글 라벨을 어느 쪽으로 통일할까 | **진단 결과 화면 어휘**(안정항로형·균형항로형·적극항로형·도전항로형) | 2026-09-09 기획 결정. `home-presenter.ts` 의 `GRADE_LABELS` 를 폐기한다 (§9-B) |

열린 질문 없음.
