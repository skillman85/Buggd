import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    testTimeout: 90000,
    hookTimeout: 30000,
    maxWorkers: 1,
  },
});
