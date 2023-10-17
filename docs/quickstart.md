# Quickstart

This monorepo uses Nx as the build system for the application.

-   [Setup](#setup)
-   [Getting Started](#getting-started)
-   [Create a new app or lib](#create-a-new-app-or-lib)
    -   _[Adding capabilities to the workspace](#adding-capabilities-to-the-workspace)_
    -   _[Generate a new application](#generate-a-new-application)_
    -   _[Generate a new library](#generate-a-new-library)_
    -   _[Generate a new VS Code Plugin](#generate-a-new-vs-code-plugin)_
-   [Development commands](#development-commands)

## Setup

```bash
# Install dependencies
npm install

# Run nx commands
npx nx ...
```

You have to run `npx nx <nx-command>` if you don't install the Nx cli globally. If you want to install the Nx cli
globally run `npm install -g nx`.

## Getting started

In the package.json we added a few commands that wrap the nx commands for easier usage (and less typing). Of course, you
can use the Nx commands directly.

```bash
# lint
npm run lint
# npx nx run-many --target lint --all

# test
npm run test
# npx nx run-many --target test --all

# Run tests with code coverage
npx nx run-many --target test --all --parallel --coverage

# build the application
npm run build
# npx nx run-many --target build --all

# show dependency graph
npm run graph
# npx nx graph
```

Additionally, there are specific commands for each app and lib.

## Create a new app or lib

### Adding capabilities to the workspace

Nx supports many plugins which add capabilities for developing different types of applications and different tools. \
These capabilities include generating applications, libraries, etc. as well as the devtools to test, and build projects
as well.

Below are our core plugins:

-   [React](https://reactjs.org)
    -   `npm install --save-dev @nx/react`
-   Web (no framework frontends)
    -   `npm install --save-dev @nx/web`
-   [Node](https://nodejs.org)
    -   `npm install --save-dev @nx/node`

There are also many [community plugins](https://nx.dev/community) you could add.

-   [Vue Community Plugin](https://github.com/ZachJW34/nx-plus/tree/master/libs/vue)
    -   `npm install --save-dev @nx-plus/vue`

### Generate a new application

Run `npx nx g @nx/node:app my-app` to generate an application.

> You can use any of the plugins above to generate applications as well.

When using Nx, you can create multiple applications and libraries in the same workspace.

### Generate a new library

Run `npx nx g @nx/node:lib my-lib` to generate a library.

> You can also use any of the plugins above to generate libraries as well.

Libraries are shareable across libraries and applications. They can be imported from `@miranum-ide/mylib`.

**Publishable Libs**

```
npx nx g @nx/node:lib my-awesome-lib --publishable --importPath @miranum-ide/my-awesome-lib
```

## Generate a new VS Code Plugin

1. Run `npx nx g @nx/node:app my-app --directory apps` to generate a node application.

2. Add a `package.json` file under `src` to your new app with the commands required for vscode.

    ```json
    {
        "name": "my-app",
        "displayName": "Miranum: ...",
        "description": "...",
        "license": "Apache-2.0",
        "version": "0.1.0",
        "publisher": "miragon-gmbh",
        "homepage": "https://www.miranum.io/",
        "icon": "assets/miranum_logo.png",
        "galleryBanner": {
            "color": "#F0F8FF",
            "theme": "light"
        },
        "repository": {
            "type": "git",
            "url": "https://github.com/Miragon/miranum-ide.git"
        },
        "bugs": {
            "url": "https://github.com/Miragon/miranum-ide/issues"
        },
        "engines": {
            "vscode": "^1.76.0"
        },
        "categories": ["Other"],
        "keywords": [],
        "main": "main.js",
        "activationEvents": [],
        "contributes": {}
    }
    ```

3. Add a `webpack.config.js` to avoid build errors and enable it in `project.json` with the build
   option `webpackConfig`

    ```javascript
    // Helper for combining webpack config objects
    const { merge } = require("webpack-merge");

    module.exports = (config, context) => {
        return merge(config, {
            // overwrite values here
            externals: {
                vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
                // modules added here also need to be added in the .vscodeignore file
            },
        });
    };
    ```

4. Add run configs in [.vscode/launch.json](../.vscode/launch.json)

    ```json
    {
        "name": "Run <app-name>",
        "type": "extensionHost",
        "request": "launch",
        "args": [
            "--disable-extensions",
            "--extensionDevelopmentPath=${workspaceFolder}/dist/apps/<my-app>"
        ],
        "outFiles": ["${workspaceFolder}/dist/apps/<my-app>/**/*.js"],
        "resolveSourceMapLocations": [
            "${workspaceFolder}/dist/apps/<my-app>/**",
            "!**/node_modules/**"
        ],
        "sourceMapPathOverrides": {
            "webpack:///./~/*": "${workspaceFolder}/node_modules/*",
            "webpack://?:*/*": "${workspaceFolder}/apps/<my-app>/*"
        }
    }
    ```

    > _*Note:*_ Replace `<my-app>` with the actual name from Step 1.

5. Add standard extension code to the `main.ts`

### Add a new Webview
If your VS Code Plugin needs a webview, you can use the build in *build executors* to create it.
Dependent on the framework you want to use, there may be different executors available.
In the long run, we want to have only **Vue 3** as a dependency.
However, right now because of the **Miranum Forms Plugin** we have to use **Vue 2**.

1. This will generate a new folder under `apps/`
 
    ```shell
    npx nx g @nx/web:rollup my-webview --directory apps --bundler vite
    ```
   
2. Alter the `main.ts` file and add the `App.vue` in your new application.

## Development commands

### Development server

Run `npx nx serve my-app` for a dev server. Navigate to http://localhost:4200/. The app will automatically reload if you
change any of the source files.

### Code scaffolding

Run `npx nx g @nx/react:component my-component --project=my-app` to generate a new component.

### Build

Run `npx nx build my-app` to build the project. The build artifacts will be stored in the `dist/` directory. Use
the `--prod` flag for a production build.

### Running unit tests

Run `npx nx test my-app` to execute the unit tests via [Jest](https://jestjs.io).

Run `npx nx affected:test` to execute the unit tests affected by a change.

### Running end-to-end tests

Run `npx nx e2e my-app` to execute the end-to-end tests via [Cypress](https://www.cypress.io).

Run `npx nx affected:e2e` to execute the end-to-end tests affected by a change.

### Understand your workspace

Run `npx nx graph` to see a diagram of the dependencies of your projects.
