import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: [
            "src/**/*.integration.test.ts",
            "src/indexer/embedder-ollama.test.ts",
            "**/node_modules/**",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          exclude: ["src/e2e/ollama-embedding.integration.test.ts", "**/node_modules/**"],
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: "live",
          include: [
            "src/indexer/embedder-ollama.test.ts",
            "src/e2e/ollama-embedding.integration.test.ts",
          ],
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
