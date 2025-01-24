const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const pluginVue = require("eslint-plugin-vue");
const eslintConfigPrettier = require("eslint-config-prettier");
// import baseConfig from "../../eslint.config.cjs";

module.exports = [
    {
        // Global ignore
        ignores: ["**/*.config.{js,mts}"],
    },
    // ...baseConfig,
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs["flat/recommended"],
    {
        files: ["**/*.{ts,vue}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: true,
            },
        },
        rules: {
            "vue/multi-word-component-names": "off",
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
    eslintConfigPrettier,
];
