/* eslint-disable */
export default {
    displayName: "vscode-shared-miranum-console",
    preset: "../../../../jest.preset.js",
    testEnvironment: "node",
    transform: {
        "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
    },
    moduleFileExtensions: ["ts", "js", "html"],
    coverageDirectory: "../../../../coverage/libs/vscode/shared/miranum-console",
};
