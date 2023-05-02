# Miranum-VSCode Lib

We have multiple libs for our VS Code Plugins.  
The separation of *miranum-vscode* and *miranum-vscode-webview* was necessary because importing modules that use
the **VS Code API** inside a webview cause problems while bundling.
Vite attempt to include the VS Code API in the final bundle, but since the API only exists inside VS Code,
Vite will exit with an error. Externalizing the package in the vite config doesn't solve the problem, as it leaves
an import statement that cannot be resolved at runtime.
