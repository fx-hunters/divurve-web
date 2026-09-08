# 0050. X-Ray 집중도 Enum 어휘를 백엔드에 맞추고, 라벨 테이블을 리터럴 유니온으로 잠근다

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | AI Agent (Claude) |
| 변경 유형 | fix |
| 영향 범위 | 화면(X-Ray 통화 노출·통화 적합도) / API 타입 / 테스트 픽스처 |
| 관련 브랜치 | fix/xray-enum-vocabulary |
| 관련 커밋 | (PR 생성 시 기입) |
| 관련 이슈·PR | #54 (점검 리포트 #47, `docs/api-audit-2026-09.md` H5·§4-2) |

## 변경 사유 (Why)

`xray-presenter.ts` 의 `CONCENTRATION_STATUS_LABELS` 가 `ok`·`watch`·`over` 라는 **서버에 없는 어휘**를
담고 있었다. `GET /api/v1/xray` · `GET /api/v1/fit` 실제 응답으로 확인한 어휘는
`above_threshold`·`within_threshold`·`unknown` 이다. `unknown` 만 겹쳤다.

결과로 `xray-exposure-view.tsx` 의 `status === "over"` 와 `xray-fitness-view.tsx` 의 같은 비교가
**절대 참이 되지 않아, 통화 집중도가 성향 기준선을 넘어도 "기준선 초과" 경고 배지와 경고색이
영구히 꺼져 있었다.** 라벨은 `?? status` fallback 을 타고 원문 코드가 그대로 화면에 노출됐다.

이 형태의 버그가 이번 작업에서만 세 번 나왔다(#45 forecast `regime`, #53 home badge, #54 이 건).
원인은 전부 같다 — 라벨 테이블이 `Record<string, T>` 라서 **모르는 코드가 예외 없이 조용히
흘러가고**, 그래서 커버리지 100% 인 채로 살아남았다. 어휘 하나를 고치는 것보다 **다음 어휘 변경을
컴파일 에러로 만드는 것**이 이 변경의 본 목적이다.

## 변경 내용 (What)

- `api/generated/divurve-api.ts` 에 백엔드 `allowableValues` 를 그대로 옮긴 문자열 리터럴 유니온을
  선언하고, X-Ray·fit 인터페이스의 해당 필드를 `string` 에서 유니온으로 좁혔다:
  `ConcentrationStatus` · `RiskProfileStatus` · `RiskGrade` · `FitRelationCode` ·
  `AttributionComponentKey` · `StressInterpretationCode`.
- `xray-presenter.ts`
  - `CONCENTRATION_STATUS_LABELS` 를 `Readonly<Record<ConcentrationStatus, string>>` 로 바꾸고
    어휘를 서버 값으로 교체했다. 조회 함수의 `?? fallback` 을 없앴다.
  - 화면이 리터럴을 직접 비교하지 않도록 판정 테이블 두 개를 추가했다 —
    `isConcentrationAboveThreshold()` (경고 배지·경고색의 유일한 판정 지점),
    `isRiskProfileMeasured()`.
- `xray-exposure-view.tsx` · `xray-fitness-view.tsx` 의 `status === "over"` 비교를 위 함수로 대체.
- `xray-fitness-view.tsx` 의 `riskProfileStatus === "measured"` 를 함께 고쳤다 — 서버는
  `measured` 를 **보내지 않는다**(`not_measured`/`simple_done`/`detail_done`). 같은 형태의
  네 번째 버그였다.
- `types/xray.ts` 의 `ConcentrationDiagnosis.status` · `riskProfileStatus` 를 유니온으로 좁혔다.
- 픽스처(`test/api-fixtures.ts`, `api/asset-import.test.ts`)의 어휘·단위를 실제 응답 값으로 교체.

## 영향 / 리스크

**꺼져 있던 경고가 켜진다.** 집중도가 기준선을 넘은 계정에서 배지·경고색·판정 라벨이 처음으로 표시된다.

| 지점 | 변경 전 (화면 결과) | 변경 후 |
|---|---|---|
| 집중도 판정 라벨 | `above_threshold` (원문 코드 노출) | `기준선 초과` |
| 집중도 판정 라벨 | `within_threshold` (원문 코드 노출) | `기준선 이내` |
| 경고 배지·경고색 | 항상 꺼짐 (`status === "over"` 가 항상 거짓) | 기준선 초과 시 켜짐 |
| 위험성향 등급 줄 | 항상 숨김 (`=== "measured"` 가 항상 거짓) | 진단 완료 계정에 표시 |
| 위험성향 진단 안내 문구 | 진단 완료 계정에도 항상 표시 | 미측정 계정에만 표시 |

실제 응답으로 확인해 함께 고친 **단위 불일치** 2건 (수치가 바뀌는 변경):

| 값 | 서버 원본 | 변경 전 | 변경 후 |
|---|---|---|---|
| 손익 분해 기여도 (`contribution_pp`) | `0.009` (0~1 비율) | `0.009%p` 로 표시 | `0.9%p` (`toPercent`) |
| AI 설명 근거 `gap` (`gap_pp`) | `0.3182` (`share − threshold`, 0~1) | `0.003182` (`toRatio` 로 재차 나눔) | `0.3182` (그대로 전달) |

리스크: 유니온이 좁아졌으므로 **백엔드가 새 어휘를 추가하면 빌드가 깨진다.** 그것이 의도다 —
조용히 꺼지는 대신 CI 에서 드러난다. 다만 런타임 응답 검증은 여전히 없으므로(`request<T>() as T`),
배포된 화면에 서버가 미지의 코드를 보내면 라벨이 빈칸이 된다. 경계 스키마 검증(zod 등) 도입은
리포트 §4-2 권고대로 별도 사안이다.

## 검증

- [x] 실제 응답 대조 — `GET /api/v1/xray` · `GET /api/v1/fit` · `GET /api/v1/xray/attribution` ·
      `GET /api/v1/stress/scenarios` · `POST /api/v1/fit/preview` (데모 계정) 및 백엔드 소스의
      `@Schema(allowableValues=...)`
- [x] 타입 안전 장치 동작 확인 — `CONCENTRATION_STATUS_LABELS` 에서 `within_threshold` 한 줄을
      지우면 `npm run build` 가 `TS2741: Property 'within_threshold' is missing` 로 실패한다
- [x] `npm run lint` / `npm run build` / `npx vitest run --coverage` 통과, 커버리지 100%
- [x] 수치 변경 전후 값 위 표에 기록

## 롤백 방법

이 브랜치의 커밋을 `git revert` 한다. 타입 변경이 포함돼 있어 부분 롤백(테이블만 되돌리기)은
컴파일 에러가 나므로 커밋 단위로 되돌린다.
