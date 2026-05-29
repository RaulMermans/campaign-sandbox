import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
      // Redirect next/server to a lightweight mock so tests don't initialize
      // the full Next.js runtime (which adds 3+ minutes to the collect phase).
      "next/server": path.join(rootDir, "tests/__mocks__/next-server.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    threads: false,
  },
});
