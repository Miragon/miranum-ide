const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const nxEslintPlugin = require("@nx/eslint-plugin");
const typescriptEslintEslintPlugin = require("@typescript-eslint/eslint-plugin");
const stylisticEslintPlugin = require("@stylistic/eslint-plugin");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
});

module.exports = [
    {
        ignores: ["**/dist"],
    },
    {
        plugins: {
            "@nx": nxEslintPlugin,
            "@typescript-eslint": typescriptEslintEslintPlugin,
            "@stylistic": stylisticEslintPlugin,
        },
    },
    ...compat
        .config({
            extends: [
                "eslint:recommended",
                "plugin:@typescript-eslint/recommended",
                "plugin:@stylistic/recommended-extends",
            ],
        })
        .map((config) => ({
            ...config,
            files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.vue"],
            rules: {
                ...config.rules,
                "@nx/enforce-module-boundaries": [
                    "error",
                    {
                        enforceBuildableLibDependency: true,
                        allow: [],
                        depConstraints: [
                            {
                                sourceTag: "*",
                                onlyDependOnLibsWithTags: ["*"],
                            },
                        ],
                    },
                ],
                "@typescript-eslint/no-empty-function": [
                    "error",
                    {
                        allow: ["arrowFunctions"],
                    },
                ],
                "@stylistic/quotes": [
                    "error",
                    "double",
                    {
                        allowTemplateLiterals: true,
                    },
                ],
                "@stylistic/lines-between-class-members": ["error", "always"],
                "@stylistic/padded-blocks": [
                    "error",
                    {
                        blocks: "never",
                        classes: "never",
                        switches: "never",
                    },
                ],
                "@stylistic/indent": "off",
                "@stylistic/semi": ["error", "always"],
                "@stylistic/operator-linebreak": "off",
                "@stylistic/arrow-parens": ["error", "always"],
                "@stylistic/member-delimiter-style": [
                    "error",
                    {
                        multiline: {
                            delimiter: "semi",
                            requireLast: true,
                        },
                        singleline: {
                            delimiter: "semi",
                            requireLast: false,
                        },
                    },
                ],
                "@stylistic/brace-style": "off",
                "@stylistic/indent-binary-ops": "off",
            },
            languageOptions: {
                parserOptions: {
                    project: ["tsconfig.*?.json"],
                },
            },
        })),
    ...compat
        .config({
            extends: ["plugin:@nx/typescript"],
        })
        .map((config) => ({
            ...config,
            files: ["**/*.ts", "**/*.tsx", "**/*.cts", "**/*.mts"],
            rules: {
                ...config.rules,
                "@typescript-eslint/no-explicit-any": "warn",
                "import/no-extraneous-dependencies": "off",
            },
        })),
    ...compat
        .config({
            extends: ["plugin:@nx/javascript"],
        })
        .map((config) => ({
            ...config,
            files: ["**/*.js", "**/*.jsx", "**/*.cjs", "**/*.mjs"],
            rules: {
                ...config.rules,
            },
        })),
];
