/* eslint-disable */
export default {
    displayName: "miranum-modeler",
    testEnvironment: "node",
    transform: {
        "^.+\\.[tj]s$": [
            "ts-jest",
            {
                tsconfig: "<rootDir>/tsconfig.spec.json",
            },
        ],
    },
    moduleNameMapper: {
        "^@miranum-ide/miranum-core$":
            "<rootDir>/../../libs/miranum-core/src/index.ts",
        "^@miranum-ide/miranum-vscode$":
            "<rootDir>/../../libs/vscode/miranum-vscode/src/index.ts",
        "^@miranum-ide/miranum-vscode-webview$":
            "<rootDir>/../../libs/vscode/miranum-vscode-webview/src/index.ts",
    },
    moduleFileExtensions: ["ts", "js", "html"],
    coverageDirectory: "../../coverage/apps/miranum-modeler",
};
