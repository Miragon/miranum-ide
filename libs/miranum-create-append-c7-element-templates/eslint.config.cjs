const baseConfig = require("../../eslint.config.cjs");

module.exports = [
    {
        ignores: ["**/dist"],
    },
    ...baseConfig,
    {
        files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "import/no-extraneous-dependencies": "off",
        },
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        // Override or add rules here
        rules: {},
    },
    {
        files: ["**/*.js", "**/*.jsx"],
        // Override or add rules here
        rules: {},
    },
];
