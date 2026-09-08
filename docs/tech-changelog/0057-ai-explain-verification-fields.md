# 0057 — AI 설명 폴백 사유와 급변 구간 고지 여부를 읽는다

- 이슈: #64
- 브랜치: `fix/ai-explain-verification-fields`
- 유형: fix
- 작성일: 2026-09-08

## 왜

`POST /api/v1/ai/explain` 은 검증에 걸려도 400이 아니라 **200 + `fallback: true`**
로 돌아온다. 그래서 운영자는 관리자 콘솔에서 "폴백했다" 는 사실만 보고 **왜**
폴백했는지는 서버 로그를 뒤져야 알 수 있었다.

서버는 그 답을 이미 응답에 싣고 있었다.

```json
"verification": {"numeric_match": true, "regime_disclosed": true,
                 "blocked_phrases": [], "fallback_reason": null}
```

프론트 `ExplainVerification` 은 `numericMatch`·`blockedPhrases` 둘만 읽고
`regimeDisclosed`·`fallbackReason` 을 버리고 있었다.

`fallbackReason` 은 폴백 경로 넷을 가른다(`AiService.FallbackReason`).
백엔드 주석이 이 필드를 넣은 이유를 그대로 적어 두었다 — "폴백 경로는 넷인데
그동안 응답이 전부 같은 값으로 수렴해 어느 경로였는지 알 수 없었다."
그 필드를 프론트가 다시 버리면 백엔드가 고친 문제가 화면에서 되살아난다.

## 점검 리포트(#47) 초안 F는 틀렸다

초안 F는 이렇게 지시하고 있었다.

> `Explanation` 에서 BE가 주지 않는 `sentenceCount·explainLevel·explainDomain` 제거

배포본을 직접 호출하니 **셋 다 서버가 보낸다.** 초안대로 실행했다면 멀쩡히
동작하던 필드 3개를 지우는 회귀가 됐을 것이다. 해당 항목은 폐기한다.

리포트 초안도 실물 대조 없이 실행하면 안 된다. 이번 스프린트에서 반복된 실패가
"프론트가 스스로 만든 표현을 스스로 검증한 것" 이었는데, 리포트를 그대로 믿는
것도 같은 종류의 실수다.

## 무엇을 바꿨나

- `AiFallbackReason` 리터럴 유니온 4종을 두고 `ExplainVerification` 에
  `regimeDisclosed`·`fallbackReason` 을 추가했다.
- 좁히기 함수가 유니온에 뒤처지지 않도록 `Record<AiFallbackReason, true>` 로
  선언했다 — 값을 더하면 여기도 채워야 컴파일된다.
- 모르는 사유 문자열은 `null` 로 떨어뜨린다. 라벨 없는 코드를 화면에 그대로
  흘리지 않는다.
- 관리자 화면에 `fallbackReason`·`regimeDisclosed` 를 노출하고, 경고 문구에
  사유를 함께 적는다.
- `numericMatch`·`regimeDisclosed` 가 `null` 이면 **"검증 단계에 닿지 못했다는
  뜻이지 통과했다는 뜻이 아니다"** 를 덧붙인다. 백엔드가 이슈 #122에서 폴백
  응답의 `numericMatch=true` 상수를 없앤 것과 같은 취지다.

### 라벨을 `api/` 에서 화면 쪽으로 옮겼다

처음에는 사유 문구를 `api/ai-explain.ts` 에 두었는데, 관리자 화면 테스트가
모듈 전체를 모킹하면서 **표현 헬퍼까지 스텁해야 하는 상황**이 됐다. `api/` 는
백엔드 경계만 담당하고 화면을 몰라야 한다(AGENTS.md §7.1). 한국어 라벨은
표현이므로 `screens/admin/admin-ai-explain-copy.ts` 로 옮겼다.

계약(유니온)은 `api/`, 문구는 화면. 둘 다 같은 유니온을 키로 쓰므로 어느 쪽에
값이 빠져도 컴파일이 막는다.

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 폴백 사유 | 응답에 있으나 버림 | `blocked_phrases — 금지 표현이 검출됨` |
| 급변 구간 고지 | 응답에 있으나 버림 | 표에 표시 |
| `null` 의 뜻 | 안내 없음 | "검증 단계에 닿지 못함" 명시 |
| 초안 F의 3필드 제거 | 실행 예정이었음 | **폐기** (서버가 보내는 필드다) |

## 검증

- 배포본 실물 호출로 4개 필드 존재와 `fallback_reason: null`(성공 시)을 확인했다.
- 백엔드 `AiService.FallbackReason` enum 4종과 `code()` 의 snake_case 변환을
  대조했다.
- lint 0 errors, build 성공, 107 files / 845 tests, 커버리지 100%.
- **관리자 화면 육안 확인은 하지 못했다.** 관리자 로그인에 비밀번호 입력이
  필요한데 에이전트가 비밀번호를 대신 입력하지 않는다. 렌더 결과는 단위
  테스트로 확인했다.

## 남은 것

`NarrativeFilter` 는 "예측" 을 아예 잡지 않는다. 금지어 사전에 없다.
`divurve-api#134`(ForecastService 생성 문장의 "예측")와 같은 뿌리이므로 그쪽에서
함께 다룬다. 필터의 다른 패턴(`수익을 보장`·`반드시` 등)은 정상 동작한다.

## 롤백

이 커밋을 되돌리면 된다.
