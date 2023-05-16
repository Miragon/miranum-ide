# vscode-shared-miranum-modeler

This library provides modules that are used for [miranum-modeler](apps/miranum-modeler), [miranum-bpmn-modeler-webview](apps/miranum-bpmn-modeler-webview) and [miranum-dmn-modeler-webview](apps/miranum-dmn-modeler-webview).

If you use this lib you have to add following to your `vite.config.ts`:
```ts
export default defineConfig({
    // ...
    resolve: {
        alias: [
            {
                find: "@miranum-ide/vscode/shared/miranum-modeler",
                replacement: path.resolve(
                    __dirname,
                    "../../libs/vscode/shared/miranum-modeler/src"
                )
            }
        ]
    },
    // ...
});
```
