# miranum-vscode

This library provides components, interfaces, types, etc. that you can use with your *VS Code Extension*.

## Using this lib for your webview

If you use this lib inside your webview you have to add the following to your `vite.config.ts`:
```ts
export default defineConfig({
  // ...
  resolve: {
    alias: [
      {
        find: "@miranum-ide/miranum-vscode",
        replacement: path.resolve(__dirname, "../../libs/miranum-vscode/src"),
      },
      {
        find: "vscode",
        replacement: path.resolve(
          __dirname,
          "../../libs/miranum-vscode/src/vite/dummyModule.ts",
        ),
      },
    ],
  },
  // ...
})
```
The first alias resolves the path to the lib.
The second alias is necessary because when bundling the webview, Vite will try to resolve the *vscode node module*.
But this module does not exist because it is provided by the Visual Studio Code runtime. The externalization will also cause problems during runtime.
For this reason we have created the file `dummyModule.ts`.
It is an empty file that when running vite will result in no code being inserted to the bundle.

> **_Note_**: This also makes it necessary to use `import * as vscode from "vscode";` when creating a new module
> instead of specifically import components like `import { Uri } from "vscode";`.
