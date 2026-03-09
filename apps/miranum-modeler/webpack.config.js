const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { TsconfigPathsPlugin } = require("tsconfig-paths-webpack-plugin");

/**
 * Standalone webpack configuration for the miranum-modeler VS Code extension.
 * Replaces the previous @nx/webpack-based setup.
 *
 * Key characteristics:
 * - Target: Node (VS Code extension host)
 * - Entry: src/main.ts
 * - Output: ../../dist/apps/miranum-modeler/
 * - Externalises the `vscode` module (provided by VS Code at runtime)
 * - Resolves @miranum-ide/* path aliases via TsconfigPathsPlugin
 * - Copies package.json (without devDependencies/scripts), assets, and webview dist folders
 *
 * @param {object} env - Webpack environment variables
 * @param {{ mode: "production" | "development" }} argv - Webpack CLI arguments
 * @returns {import("webpack").Configuration}
 */
module.exports = (env, argv) => {
    const isProd = argv.mode === "production";

    return {
        target: "node",
        mode: isProd ? "production" : "development",
        entry: "./src/main.ts",
        output: {
            path: path.resolve(__dirname, "../../dist/apps/miranum-modeler"),
            filename: "main.js",
            libraryTarget: "commonjs2",
        },
        resolve: {
            extensions: [".ts", ".js"],
            plugins: [
                // Resolves @miranum-ide/* path aliases from tsconfig.app.json.
                new TsconfigPathsPlugin({
                    configFile: path.resolve(__dirname, "tsconfig.app.json"),
                }),
            ],
        },
        externals: {
            // The vscode module is provided by VS Code at runtime and must not be bundled.
            vscode: "commonjs vscode",
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: "ts-loader",
                    exclude: /node_modules/,
                },
            ],
        },
        plugins: [
            new CopyWebpackPlugin({
                patterns: [
                    {
                        // Copy the extension manifest, stripping devDependencies and scripts
                        // to keep the distributable package.json lean.
                        from: path.resolve(__dirname, "package.json"),
                        to: ".",
                        transform: (content) => {
                            const pkg = JSON.parse(content.toString());
                            delete pkg.devDependencies;
                            delete pkg.scripts;
                            return JSON.stringify(pkg, null, 2);
                        },
                    },
                    {
                        from: path.resolve(__dirname, "assets"),
                        to: "assets",
                    },
                    {
                        from: path.resolve(__dirname, "../../LICENSE"),
                        to: ".",
                        noErrorOnMissing: true,
                    },
                    {
                        from: path.resolve(__dirname, "../../README.md"),
                        to: ".",
                        noErrorOnMissing: true,
                    },
                    {
                        from: path.resolve(__dirname, "../../CHANGELOG.md"),
                        to: ".",
                        noErrorOnMissing: true,
                    },
                    {
                        // Copy the BPMN webview build artefacts into the extension output.
                        from: path.resolve(
                            __dirname,
                            "../../dist/apps/miranum-modeler/miranum-modeler-bpmn-webview",
                        ),
                        to: "miranum-modeler-bpmn-webview",
                        noErrorOnMissing: true,
                    },
                    {
                        // Copy the DMN webview build artefacts into the extension output.
                        from: path.resolve(
                            __dirname,
                            "../../dist/apps/miranum-modeler/miranum-modeler-dmn-webview",
                        ),
                        to: "miranum-modeler-dmn-webview",
                        noErrorOnMissing: true,
                    },
                ],
            }),
        ],
        devtool: isProd ? false : "source-map",
    };
};
