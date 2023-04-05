# Shared-Miranum-Forms

This library provides modules that are used for [miranum-forms](apps/miranum-forms) and [miranum-forms-webview](apps/miranum-forms-webview).

If you use this lib you have to add following to your `vite.config.ts`:
```ts
export default defineConfig({
    // ...
    resolve: {
        alias: [
            {
                find: "@miranum-ide/vscode/shared/miranum-forms",
                replacement: path.resolve(
                    __dirname,
                    "../../libs/vscode/shared/miranum-forms/src"
                )
            }
        ]
    },
    // ...
});
```
