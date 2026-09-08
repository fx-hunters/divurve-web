# 0064 — 비중 조정 시뮬레이터가 서버의 조정 전후 집중도를 실제로 표시한다

- 이슈: #63
- 브랜치: `fix/fit-preview-concentration`
- 유형: fix
- 작성일: 2026-09-08

## 왜

X-Ray '통화 적합도' 탭의 비중 조정 시뮬레이터에서 통화와 비율을 고르고
'조정 결과 보기' 를 눌러도 결과가 나오지 않았다.

```
조정 전 집중도   91.8%
조정 후 집중도   -
```

서버는 조정 후 값을 정확히 계산해 보내고 있었다. 화면이 버렸을 뿐이다.
**시뮬레이터의 존재 이유가 통째로 작동하지 않는 상태였다.**

`POST /api/v1/fit/preview` 실제 응답(배포본 직접 호출, 2026-09-08):

```json
"concentration": {
  "before": {"top_currency_code":"USD","share":0.9182,"status":"above_threshold"},
  "after":  {"top_currency_code":"USD","share":0.8209,"status":"above_threshold"},
  "threshold": 0.6 }
```

프론트는 `FitPreviewResponse.concentration` 을 `/xray` 의 `XrayConcentration`
(`{share, status}`)으로 선언해 두고 `concentration.share` 를 읽었다. 그런 키가
없으니 `undefined` 가 되고, 렌더가 그것을 `-` 로 떨어뜨렸다.

**'조정 전' 값도 출처가 틀렸다.** 미리보기 응답의 `before` 가 아니라 바깥 X-Ray
집중도를 읽고 있었다. 두 값이 우연히 같아서 맞아 보였을 뿐, 가정이 바뀌면
어긋난다.

이름이 같다고 같은 값이 아니다. `/xray` 의 `concentration` 은 현재 상태 한 점이고,
`/fit/preview` 의 `concentration` 은 가정 전후 두 점 + 기준선이다.

## 무엇을 바꿨나

- `FitPreviewConcentrationPoint` 를 새로 두고 `FitPreviewResponse.concentration` 을
  `{before, after, threshold}` 로 고쳤다. `XrayConcentration` 재사용을 끊었다.
- 화면이 미리보기 응답의 `before`·`after` 를 나란히 그린다. 통화 코드와 기준선
  판정(`status`)도 함께 표시한다.
- 두 줄을 그리는 `ConcentrationPointRow` 표현 컴포넌트를 분리했다. 색은 판정을
  따른다 — **조정 후라고 무조건 안전색을 칠하면 여전히 기준선을 넘는 결과를
  안전한 것처럼 보이게 만든다.** 예전 코드가 그랬다(`조정 후` 에 `--normal` 고정).
- `FitPreviewState` 가 응답 모양을 다시 적지 않고 `FitPreviewResponse` 를 그대로
  쓴다. 모양을 두 곳에 적으면 서버와 갈라져도 알 수 없다.

## 왜 지금까지 안 잡혔나

`undefined` 가 `NaN` 이 아니라 `-` 로 렌더돼 크래시가 아니었다. 린트·빌드·화면
스모크·**커버리지 100%** 를 모두 통과하며 살아남았다.

테스트가 오히려 버그를 고정하고 있었다. `"75%"`(바깥 X-Ray 값)와 `"68%"`(픽스처
값)를 기대했는데, 픽스처의 `concentration` 이 실제 응답이 아니라 `/xray` 모양을
베껴 온 것이었다. 심지어 `concentration: { status: "unknown" }` 을 넣고
`"-" 가 2개 나온다` 를 확인하는 테스트까지 있었다 — **버그가 정상 동작으로
문서화되어 있었다.**

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 조정 전 집중도 | 91.8% (바깥 X-Ray 값) | 91.8% (미리보기 `before`) |
| 조정 후 집중도 | **`-`** | **82.1%** |
| 조정 후 판정 표시 | 없음 | `USD · 기준선 초과` |
| 조정 후 색 | `--normal` 고정 | 판정에 따름 |
| 픽스처 `concentration` | `/xray` 모양 (실제와 다름) | 실제 응답 |

## 검증

- 타입을 고치자 `share` 를 읽던 두 곳을 `tsc` 가 즉시 `TS2339` 로 잡았다.
- lint 0 errors, build 성공, 107 files / 843 tests, 커버리지 100%.
- 5173 실제 화면에서 JPY +10% 조정 시 `91.8% → 82.1%` 표시를 확인했다.

## 롤백

이 커밋을 되돌리면 된다.
