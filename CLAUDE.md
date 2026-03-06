# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Miranum IDE is a VS Code extension for BPMN/DMN process modeling, built with **Yarn 4 workspaces**. It provides:
- **Camunda Modeler** (`miranum-modeler`): BPMN 2.0 and DMN diagram editor for Camunda 7 and 8

## Commands

Use `corepack yarn` as the package manager (required in non-interactive shells like Claude Code's Bash tool). Build orchestration uses `npm-run-all`.

```bash
# Install dependencies
corepack yarn install

# Build everything (libs → webviews + plugin in parallel)
corepack yarn build

# Build only the shared libraries
corepack yarn build:libs

# Development watch mode
corepack yarn dev

# Test (Jest, extension host only)
corepack yarn test

# Lint
corepack yarn lint

# Target a single workspace directly
corepack yarn workspace vs-code-bpmn-modeler build
corepack yarn workspace miranum-modeler-bpmn-webview build

# Run a single test file (Jest)
corepack yarn test --testPathPattern=apps/miranum-modeler/src/service/bpmnUtils.spec.ts
```

## Architecture

### Project Structure

```
apps/
  miranum-modeler/              # VS Code extension: BPMN/DMN editor (Node/Webpack)
  miranum-modeler-bpmn-webview/ # Webview frontend for BPMN (Vite/browser)
  miranum-modeler-dmn-webview/  # Webview frontend for DMN (Vite/browser)
libs/
  miranum-core/                 # Shared domain types (Artifact, MiranumConfig, etc.)
  vscode/miranum-vscode/        # Shared VS Code helpers (Logger, editor utilities)
  vscode/miranum-vscode-webview/ # Shared webview utilities and message types
```

### Service Architecture (Flat, No DI Framework)

The extension (`miranum-modeler`) uses a flat service architecture with plain constructor wiring:

```
src/
  domain/           # Pure domain types — no external dependencies
    session.ts      # ModelerSession: per-editor echo-prevention guard counter
    model.ts        # BpmnModelerSetting, SettingBuilder
    errors.ts       # Domain error types
  infrastructure/   # VS Code API adapters
    EditorStore.ts  # Per-editor Map; manages subscriptions, postMessage
    VsCodeDocument.ts
    VsCodeWorkspace.ts
    VsCodeSettings.ts
    VsCodeUI.ts
    WebviewHtml.ts
  service/          # Business logic — owns per-editor ModelerSession maps
    BpmnModelerService.ts  # sync + display use cases; implements ArtifactChangeTarget
    DmnModelerService.ts
    ArtifactService.ts     # miranum.json config + file watchers
    bpmnUtils.ts           # Shared BPMN helpers
  controller/       # VS Code event → service call
    BpmnEditorController.ts
    DmnEditorController.ts
    CommandController.ts
  main.ts           # Plain constructor wiring: EditorStore → VsCode* → Services → Controllers
```

### Session Management (Echo Prevention)

Each open editor gets its own `ModelerSession` owned by the service:
1. Webview sends `SyncDocumentCommand` → `BpmnModelerService.sync()` acquires guard → writes document
2. Write triggers `onDidChangeTextDocument`
3. `BpmnModelerService.display()` checks `session.isGuarded()` → returns early (no echo)
4. Guard released in `finally` block

### Webview Communication

Webview apps communicate via `postMessage`. Message types: `libs/vscode/miranum-vscode-webview/src/lib/messages.ts`. Webviews built into `dist/apps/miranum-modeler/<webview-name>/` and copied into the extension output by `CopyWebpackPlugin`.

### Path Aliases (tsconfig.base.json)

- `@miranum-ide/miranum-core` → `libs/miranum-core/src/index.ts`
- `@miranum-ide/miranum-vscode` → `libs/vscode/miranum-vscode/src/index.ts`
- `@miranum-ide/miranum-vscode-webview` → `libs/vscode/miranum-vscode-webview/src/index.ts`

Resolved by `TsconfigPathsPlugin` (webpack) and `vite-tsconfig-paths` (Vite).

### Build System

- **Extension host** (Node): Webpack + `ts-loader` — `apps/miranum-modeler/webpack.config.js`
- **Webviews** (browser): Vite — `apps/miranum-modeler-{bpmn,dmn}-webview/vite.config.mts`
- **Tests**: Jest + `ts-jest` — `apps/miranum-modeler/jest.config.ts`
- Output: `dist/apps/miranum-modeler/`

### `miranum.json` Configuration

Projects can contain a `miranum.json` that declares workspace paths for artifacts (forms, element templates). `ArtifactService` reads this config and sets up file watchers. Default paths are used if absent.
