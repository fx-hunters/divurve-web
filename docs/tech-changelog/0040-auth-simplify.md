# 0040. 로그인·회원가입에서 OAuth 버튼과 휴대폰 인증 제거

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-09-08 |
| 작성자 | Claude (AI Agent) |
| 변경 유형 | chore / ui |
| 영향 범위 | 화면 (로그인·회원가입) |
| 관련 브랜치 | chore/auth-simplify |
| 관련 커밋 | (미커밋 — PR 생성 시 기입) |
| 관련 이슈·PR | #42 |

## 변경 사유 (Why)

`AuthPage`의 소셜 로그인(카카오·네이버·구글) 버튼과 휴대폰 인증 블록은 **백엔드 계약이 없는 프론트 전용 목업**이었다.

- 백엔드 `AuthController`(Swagger `/v3/api-docs`)에 소셜 로그인 엔드포인트와 휴대폰 인증 엔드포인트가 존재하지 않는다. 두 UI는 클릭해도 "Swagger 명세에 제공되지 않습니다" 안내만 띄우거나(소셜), 클라이언트에서 임의로 성공 처리(휴대폰)하는 가짜 흐름이었다.
- 특히 휴대폰 인증은 **동작하지 않는 검증을 회원가입 필수 조건으로 강제**하고 있었다(`if (!phoneVerified) errs.phone = ...`). 사용자에게는 실제 인증이 이뤄진 것처럼 보이지만 서버로 전송되는 값은 없어, 신뢰를 훼손하고 가입 경로만 길게 만들었다.
- 존재하지 않는 기능을 UI로 노출하면 심사·데모에서 곧바로 드러난다. 계약이 생기는 시점에 다시 붙이는 편이 안전하다.

## 변경 내용 (What)

`src/AuthPage.tsx` 단일 파일에서 아래를 제거했다(1463줄 → 1155줄).

- **OAuth 블록**: 로그인·회원가입 폼 각각의 "또는" 구분선 + 카카오/네이버/구글 3버튼 그룹, 그리고 이를 처리하던 `handleSocialUnavailable` 핸들러.
- **휴대폰 인증**: 상태(`phone`·`phoneSent`·`phoneCode`·`phoneVerified`), 핸들러(`handleSendPhoneCode`·`handleVerifyPhoneCode`), `handleSignup`의 `phoneVerified` 검증 분기, `errors`의 `phone`·`phoneCode` 키 분기, 휴대폰 번호·인증번호 입력 UI, "휴대폰 인증은 현재 Swagger 계약에 없어…" 안내 문구.
- **덩달아 죽은 코드**: 인증번호 카운트다운 전용이던 `countdown` 상태·`timerRef`·`startCountdown()`·언마운트 타이머 정리 `useEffect`, 그리고 그 타이머만 포매팅하던 `fmtTime()` export. `useRef` import도 함께 제거.
- `inputBtnStyle`은 이메일 "형식 확인" 버튼이 계속 사용하므로 유지.

회원가입 제출 payload는 이미 `{ email, password, name }`뿐이라 `api/auth.ts`의 `SignupRequest`와 일치하며, **API 요청 형태는 변경되지 않았다**.

테스트(`src/AuthPage.test.tsx`, `src/app/app.test.tsx`)에서 삭제된 UI·검증을 참조하던 케이스와 조작 단계를 정리했다.

## 영향 / 리스크

- **API 계약 영향 없음.** 요청/응답 형태가 그대로다. 백엔드 변경 불필요.
- 회원가입 필수 입력이 5개(이름·이메일·비밀번호·비밀번호 확인·필수 약관)로 줄어 가입 경로가 짧아진다. 기존 가입자 데이터에는 영향이 없다(휴대폰 번호는 애초에 저장된 적 없음).
- 로그인 수단은 이메일+비밀번호 단일 경로가 된다. 소셜 로그인을 기대하던 사용자에게 대체 경로는 없으나, 기존에도 실제로 동작하지 않았으므로 기능 손실은 아니다.
- `components/common/icon.tsx`의 소셜 전용 아이콘은 이 변경에서 건드리지 않았다(이슈 #38 `chore/app-shell-nav`가 같은 파일을 수정 중 — 충돌 회피). 후속 정리 대상.

## 검증

- [x] `npm run lint` — 0 errors (기존 `react-refresh/only-export-components` warning 16건만 잔존, 이번 변경과 무관)
- [x] `npm run build` — `tsc --noEmit` + `vite build` 통과
- [x] 테스트 통과 + 커버리지 100% — 94개 파일 / 702 테스트 통과, statements·branch·functions·lines 모두 100%
- [x] `grep -in "phone\|kakao\|naver\|카카오\|네이버\|구글\|oauth" src/AuthPage.tsx` → 0건
- [x] 실제 브라우저(dev server)에서 로그인·회원가입 화면 확인 — OAuth 버튼·구분선·휴대폰 필드 모두 미노출
- [x] 회원가입 폼을 끝까지 입력해 제출 → 클라이언트 검증을 모두 통과하고 signup API 호출까지 도달(백엔드 미기동으로 네트워크 오류만 표시). "휴대폰 인증을 완료하세요." 차단 없음
- [x] 스크린샷: `docs/screenshots/auth-login-after.png`, `docs/screenshots/auth-signup-after.png`
- [ ] (수치 변경 시) 변경 전후 값 확인 — 해당 없음

## 롤백 방법

`src/AuthPage.tsx`·`src/AuthPage.test.tsx`·`src/app/app.test.tsx` 3개 파일만 바뀌었으므로 해당 PR 머지 커밋을 `git revert` 하면 원상복구된다. 부분 롤백이 필요하면 소셜 블록과 휴대폰 블록이 서로 독립적이므로 한쪽만 되살릴 수 있다. 다만 되살릴 경우 다시 목업 상태가 되므로, 재도입은 백엔드 엔드포인트가 Swagger에 생긴 뒤에 하는 것을 전제로 한다.
