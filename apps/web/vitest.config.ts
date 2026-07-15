import { defineConfig } from "vitest/config";

// Node env on purpose: the only invariants worth testing here are pure
// (token contrast, formatting). Nothing needs a DOM, so we don't pay for jsdom.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
