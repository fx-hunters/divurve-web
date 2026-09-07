/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
      ],
    },
  },
});
