// vitest/config의 defineConfig는 vite의 것에 test 옵션 타입을 더해준다.
import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// 한 레포에서 여러 세션이 각자 dev 서버를 띄우면 모두 5173을 잡으려 한다. vite
// 기본값은 strictPort: false 라, 뒤에 뜬 쪽이 아무 말 없이 5174로 밀린다. 그런데
// 프리뷰 도구는 `.claude/launch.json`이 가리키는 포트만 보므로 붙지 못하고,
// 밀렸다는 사실이 조용해서 원인을 찾는 데 시간이 든다.
//
// PORT가 주어지면 그 포트에만 띄운다(strictPort). 지정받은 포트를 못 쓰면 조용히
// 옮겨가는 것보다 실패하는 편이 낫다 — 어느 포트가 내 서버인지 알 수 없게 되는
// 쪽이 더 나쁘다. PORT가 없으면 vite 기본 동작(5173부터 빈 포트 탐색)을 그대로 둔다.
//
// process는 tsconfig의 types 배열에 "node"가 없어 선언돼 있지 않다. 이 한 줄을
// 위해 @types/node를 들이면 src의 setTimeout 반환 타입까지 NodeJS.Timeout으로
// 바뀌므로, 이 파일 안에서만 통하는 모듈 스코프 선언으로 막는다.
declare const process: { readonly env: Record<string, string | undefined> };

const requestedPort = Number(process.env.PORT);
const server =
  Number.isInteger(requestedPort) && requestedPort > 0
    ? { port: requestedPort, strictPort: true }
    : {};

// 병렬 작업용 git 워크트리는 `.claude/worktrees/<브랜치명>` 아래에 src 전체 사본을
// 둔다. vitest는 git 추적 여부와 무관하게 파일시스템을 스캔하므로, 제외하지 않으면
// 루트에서 테스트를 돌릴 때 같은 테스트가 워크트리 수만큼 중복 실행되고 커버리지
// 수치에도 사본이 섞인다.
const WORKTREE_GLOB = "**/.claude/**";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server,
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // app.test.tsx는 앱 전체를 28번 렌더한다. 커버리지 계측이 붙으면 기본 5초를
    // 넘겨 간헐적으로 타임아웃이 났다.
    testTimeout: 20_000,
    // exclude를 지정하면 vitest 기본값을 덮어쓰므로 configDefaults를 함께 유지한다.
    exclude: [...configDefaults.exclude, WORKTREE_GLOB],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
      // 측정 대상은 src 소스 코드로 한정 (dist·설정 파일 제외)
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/main.tsx",
        "**/api/generated/**",
        "**/*.d.ts",
        "**/types/**",
        // 테스트·셋업 파일
        "**/*.test.*",
        "**/src/test/**",
        WORKTREE_GLOB,
      ],
    },
  },
});
