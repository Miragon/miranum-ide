module.exports = {
    displayName: "miranum-modeler-bpmn-webview",
    preset: "../../jest.preset.js",
    transform: {
        "^.+.vue$": "@vue/vue3-jest",
        ".+.(css|styl|less|sass|scss|svg|png|jpg|ttf|woff|woff2)$":
            "jest-transform-stub",
        "^.+.tsx?$": [
            "ts-jest",
            {
                tsconfig: "apps/miranum-modeler-bpmn-webview/tsconfig.spec.json",
            },
        ],
    },
    moduleFileExtensions: ["ts", "tsx", "vue", "js", "json"],
    coverageDirectory: "../../coverage/apps/miranum-modeler-bpmn-webview",
    snapshotSerializers: ["jest-serializer-vue"],
    globals: {
        "vue-jest": {
            tsConfig: "apps/miranum-modeler-bpmn-webview/tsconfig.spec.json",
        },
    },
};
