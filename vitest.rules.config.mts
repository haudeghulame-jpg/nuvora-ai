import { defineConfig } from "vitest/config";

// Security-rules tests. They need the Firestore emulator, so they are NOT part
// of `npm test`. Run them with `npm run test:rules` inside the emulator (CI does
// this with `firebase emulators:exec`). They use no real Firebase project and
// no billing: the emulator runs locally.
export default defineConfig({
  test: {
    environment: "node",
    include: ["rules-tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
