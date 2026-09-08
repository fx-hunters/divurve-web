// vitest/config의 defineConfig는 vite의 것에 test 옵션 타입을 더해준다.
import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// 병렬 작업용 git 워크트리는 `.claude/worktrees/<브랜치명>` 아래에 src 전체 사본을
// 둔다. vitest는 git 추적 여부와 무관하게 파일시스템을 스캔하므로, 제외하지 않으면
// 루트에서 테스트를 돌릴 때 같은 테스트가 워크트리 수만큼 중복 실행되고 커버리지
// 수치에도 사본이 섞인다.
const WORKTREE_GLOB = "**/.claude/**";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
