import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Solo los archivos `*.test.ts(x)` son suites. El default de Jest trata como suite CUALQUIER
  // archivo dentro de un `__tests__/`, lo que impide tener ahí fixtures y helpers compartidos
  // (fallarían con "Your test suite must contain at least one test"). Con esta regla, un
  // `__tests__/` puede organizarse en subcarpetas por responsabilidad y tener su propio
  // `helpers/` al lado de las suites que lo usan.
  testMatch: ["<rootDir>/**/*.test.{ts,tsx}"],
};

export default createJestConfig(config);
