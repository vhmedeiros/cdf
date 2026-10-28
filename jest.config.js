const nextJest = require("next/jest");
const dotenv = require("dotenv");
const dotenvExpand = require("dotenv-expand");

dotenvExpand.expand(dotenv.config({ path: ".env.development" }));

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  moduleDirectories: ["node_modules", "<rootDir>/"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  testTimeout: 60000,
};

module.exports = createJestConfig(customJestConfig);
