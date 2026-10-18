import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname } },
  // Délais bornés : un test ne peut jamais bloquer la suite.
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node", testTimeout: 20_000, hookTimeout: 20_000, teardownTimeout: 10_000 },
});
