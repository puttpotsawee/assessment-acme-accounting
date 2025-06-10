
export default {
    moduleFileExtensions: [
      "js",
      "json",
      "ts"
    ],
    rootDir: "../../../src",
    testRegex: ".*\\.integration\\.test\\.ts$",
    transform: {
      ".+\\.(t|j)s$": "ts-jest"
    },
    collectCoverageFrom: [
      "**/*.(t|j)s"
    ],
    coverageDirectory: "../coverage",
    testEnvironment: "node",
    setupFilesAfterEnv: [
      "./tests/integration/setupIntegrationJest.ts"
    ]
}