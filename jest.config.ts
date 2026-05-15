import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^server-only$": "<rootDir>/src/__mocks__/server-only.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Keep Playwright specs out of Jest's scan
  testPathIgnorePatterns: ["/node_modules/", "/.next/", "<rootDir>/tests/"],
};

export default createJestConfig(config);
