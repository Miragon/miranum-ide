module.exports = {
    displayName: "bpmn-webview",
    transform: {
        "^.+.vue$": "@vue/vue3-jest",
        ".+.(css|styl|less|sass|scss|svg|png|jpg|ttf|woff|woff2)$":
            "jest-transform-stub",
        "^.+.tsx?$": [
            "ts-jest",
            {
                tsconfig: "apps/bpmn-webview/tsconfig.spec.json",
            },
        ],
    },
    moduleFileExtensions: ["ts", "tsx", "vue", "js", "json"],
    coverageDirectory: "../../coverage/apps/bpmn-webview",
    snapshotSerializers: ["jest-serializer-vue"],
    globals: {
        "vue-jest": {
            tsConfig: "apps/bpmn-webview/tsconfig.spec.json",
        },
    },
};
