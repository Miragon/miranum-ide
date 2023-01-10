# Quickstart

This monorepo uses Nx as build system for the application.

## Setup

````bash
# Install dependencies
npm install

# Run nx commands
npx nx ...
````

You have to run `npx nx <nx-command>` if you don't install the Nx cli globally. If you want to install the Nx cli globally run `npm install -g nx`.


## Getting started

In the package.json we added a few commands that wrap the nx commands for easier usage (and less typing). Of course, you can use the Nx commands directly.

````bash
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
````

Additionally, there are specific commands for each app and lib.

## Create a new app or lib

### Adding capabilities to your workspace

Nx supports many plugins which add capabilities for developing different types of applications and different tools.

These capabilities include generating applications, libraries, etc as well as the devtools to test, and build projects as well.

Below are our core plugins:

- [React](https://reactjs.org)
  - `npm install --save-dev @nrwl/react`
- Web (no framework frontends)
  - `npm install --save-dev @nrwl/web`
- [Angular](https://angular.io)
  - `npm install --save-dev @nrwl/angular`
- [Nest](https://nestjs.com)
  - `npm install --save-dev @nrwl/nest`
- [Express](https://expressjs.com)
  - `npm install --save-dev @nrwl/express`
- [Node](https://nodejs.org)
  - `npm install --save-dev @nrwl/node`

There are also many [community plugins](https://nx.dev/community) you could add.

- [Vue Community Plugin](https://github.com/ZachJW34/nx-plus/tree/master/libs/vue)
  - `npm install --save-dev @nx-plus/vue`

### Generate an application

Run `nx g @nrwl/node:app my-app` to generate an application.

> You can use any of the plugins above to generate applications as well.

When using Nx, you can create multiple applications and libraries in the same workspace.

### Generate a library

Run `nx g @nrwl/node:lib my-lib` to generate a library.

> You can also use any of the plugins above to generate libraries as well.

Libraries are shareable across libraries and applications. They can be imported from `@miranum-ide/mylib`.

**Publishable Libs**

```
npx nx g @nrwl/node:lib my-awesome-lib --publishable --importPath @miranum-ide/my-awesome-lib
```

### Generate a VSCode-Extension

1. Run `nx g @nrwl/node:app my-app` to generate a node application.

2. Add a `package.json` file under `src` to your new app with the commands required for vscode.

````json
{
  "name": "example",
	"displayName": "example",
	"description": "",
	"version": "0.0.1",
	"engines": {
		"vscode": "^1.69.0"
	},
	"categories": [
		"Other"
	],
	"activationEvents": [
        "onCommand:miranum-console.helloWorld"
	],
	"main": "../../../dist/apps/example/main.js",
	"contributes": {
		"commands": [
			{
				"command": "example.helloWorld",
				"title": "Hello World"
			}
		]
	}
}
````

3. Add a `custom-webpack.config.js` to avoid build errors and enable it in `project.json` with the build option `webpackConfig`

````javascript
// Helper for combining webpack config objects
const { merge } = require('webpack-merge');

module.exports = (config, context) => {
    return merge(config, {
        // overwrite values here
        externals: {
            vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
            // modules added here also need to be added in the .vscodeignore file
        },
    });
};
````

4. Add standard extension code to the `main.ts`

5. Setup run configs in `.vscode`

When using Nx, you can create multiple applications and libraries in the same workspace.

## Development commands

### Development server

Run `nx serve my-app` for a dev server. Navigate to http://localhost:4200/. The app will automatically reload if you change any of the source files.

### Code scaffolding

Run `nx g @nrwl/react:component my-component --project=my-app` to generate a new component.

### Build

Run `nx build my-app` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

### Running unit tests

Run `nx test my-app` to execute the unit tests via [Jest](https://jestjs.io).

Run `nx affected:test` to execute the unit tests affected by a change.

### Running end-to-end tests

Run `nx e2e my-app` to execute the end-to-end tests via [Cypress](https://www.cypress.io).

Run `nx affected:e2e` to execute the end-to-end tests affected by a change.

### Understand your workspace

Run `nx graph` to see a diagram of the dependencies of your projects.
