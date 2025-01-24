const baseConfig = require("../../eslint.config.cjs");

module.exports = [
    {
        ignores: ["**/dist"],
    },
    ...baseConfig,
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
        // Override or add rules here
        rules: {},
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
    {
        files: ["**/*.js", "**/*.jsx"],
        // Override or add rules here
        rules: {},
    },
];
