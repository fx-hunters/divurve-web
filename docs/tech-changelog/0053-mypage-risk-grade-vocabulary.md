# 0053 — 마이페이지 위험성향 등급을 서버 기계 코드로 판정한다

- 이슈: #59
- 브랜치: `fix/mypage-risk-grade-vocabulary`
- 유형: fix
- 작성일: 2026-09-08

## 왜

이슈는 "`aggressive`·`challenging` 두 값이 매핑표에 없다"로 열렸다. 실제 응답을
확인하니 어휘 누락은 증상이고, 원인은 **화면이 기계 코드 대신 한글 라벨을 넘기고
있었던 것**이었다.

```
GET /api/v1/me/risk-profile
{"status":"simple_done","grade":"balanced","grade_label":"균형항로형", ...}
```

`mypage-screen.tsx` 는 `grade` 를 놔두고 `gradeLabel`("균형항로형")을 넘겼고,
`SERVER_RISK_KIND` 가 그 한글을 역매핑해 `balanced` 를 얻은 뒤,
`getRiskProfileDisplayName` 이 다시 "균형항로형" 을 만들어 냈다. **한글 문자열을
경유해 입력을 그대로 재생산하는 왕복**이다. 라벨은 표시용 문구지 식별자가 아니므로,
서버가 문구를 손대면 매칭이 깨지고 "기존 진단 결과" 라는 맥빠진 문구로 떨어진다.

실제로 그 흔들림을 문자열로 막아보려 한 흔적이 남아 있었다 — 매핑표에
`안정형`·`균형형`·`안정항로형` … 13개 키가 늘어서 있었고, `trim().toLowerCase()`
로 공백까지 지우고 있었다. 그러면서 정작 서버가 보내는 `aggressive`·`challenging`
두 값은 없었다. 픽스처의 `gradeLabel` 이 `"균형 항로형"`(공백 포함)이었던 것도
이 공백 제거 덕에 통과하고 있었을 뿐이다.

서버는 처음부터 안정적인 기계 코드 `grade` 를 함께 주고 있었다.

## 무엇을 바꿨나

- `RiskProfileResponse.status`·`grade` 를 `string` 에서 `RiskProfileStatus`·
  `RiskGrade` 유니온으로 조였다.
- 서버 등급 → 프론트 진단 어휘 변환표를 `components/diagnosis/diagnosis-presenter.ts`
  한 곳에 `Record<RiskGrade, RiskProfileKind>` 로 두었다. 4종 중 하나라도 빠지면
  컴파일이 실패한다.
- 화면이 `gradeLabel` 대신 `grade` 를 넘기게 하고, 한글 역매핑 사전 13개 키를 지웠다.
- `isMeasured` 를 `gradeLabel !== ""` 대신 서버 `status` 로 판정한다.
- `isRiskProfileMeasured` 를 `screens/xray/xray-presenter.ts` 에서
  `components/diagnosis/diagnosis-presenter.ts` 로 옮겼다. 마이페이지가 같은 판정을
  쓰게 되면서 `screens → screens` 옆걸음 import 가 생길 참이었다(§7.1).

`src/types/diagnosis.ts` 의 `RiskProfileKind`(`active`·`challenger`)는 그대로 두었다.
프론트 자체 진단 플로가 쓰는 고유 어휘라 서버 어휘와 별개로 두고 경계에서만
변환하는 편이 맞다.

## 픽스처가 버그를 가리고 있었다

`MY_PAGE_API_FIXTURE.riskProfile.status` 는 `"measured"` 였다 — **서버가 보내지 않는
값**이다. 프론트 타입이 `string` 이라 아무도 막지 않았다.

등급 테스트는 14행짜리 표로 커버리지 100% 를 채우고 있었지만, 그중 서버가 실제로
보내는 값은 `stable`·`balanced` 둘뿐이었다. 나머지 12행은 존재하지 않는 값이었고,
정작 실제 값인 `aggressive`·`challenging` 은 한 줄도 없었다. #47 점검 리포트가
지적한 "픽스처를 프론트 타입에서 역산해 FE 가 FE 와 일치하는지만 검증한다" 의
교과서적 사례다.

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 픽스처 `status` | `"measured"` (서버에 없음) | `"simple_done"` |
| 픽스처 `gradeLabel` | `"균형 항로형"` (공백 포함) | `"균형항로형"` |
| 픽스처 `score` / `diagnosedOn` | `72` / `2026-08-15` | `4` / `2026-09-08` |
| 등급 테스트 행 | 14행 중 실제 값 2개 | 4행 전부 실제 값 |
| 매핑표 키 | 13개 (한글 9 + 미존재 3) | 4개 |

## 검증

- `challenging` 키를 지우고 `tsc` 가 `TS2741` 로 막는 것을 확인했다. 되돌린 뒤 통과.
- lint 0 errors, build 성공, 107 files / 843 tests, 커버리지 100%.
- 5173 에서 마이페이지 실제 화면으로 등급 표시를 확인했다.

## 롤백

이 커밋을 되돌리면 된다. 타입만 되돌리고 화면 코드를 두면 `gradeLabel` 을
`RiskGrade` 자리에 넘기게 되므로 부분 롤백은 하지 않는다.
