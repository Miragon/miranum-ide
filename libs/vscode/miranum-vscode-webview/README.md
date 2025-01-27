# Miranum-VSCode-Webview

This library provides modules that can be used within your webviews.

If you use this lib you have to add following to your `vite.config.mts`:

```ts
export default defineConfig({
    // ...
    resolve: {
        alias: [
            {
                find: "@miranum-ide/vscode/miranum-vscode-webview",
                replacement: path.resolve(
                    __dirname,
                    "../../libs/vscode/miranum-vscode-webview/src"
                )
            }
        ]
    },
    // ...
});
```
