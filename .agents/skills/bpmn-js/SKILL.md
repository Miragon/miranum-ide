---
name: bpmn-js
description: bpmn-js modeler internals — EventBus, services, copy-paste architecture, clipboard polyfill, modeler lifecycle. Use when working on bpmn-webview, diagram interactions, copy-paste, clipboard, or element templates.
---

# bpmn-js Modeler Internals

This skill covers how the BPMN webview (`apps/bpmn-webview/`) uses the bpmn-js library to render and edit BPMN diagrams, including the copy-paste architecture and clipboard polyfill.

## Modeler Initialization

The modeler is encapsulated in `packages/bpmn-modeler/src/modeler.ts` as a `BpmnModeler` class, created through the public `createModeler(container, options)` factory (`createModeler.ts`). `BpmnModeler.init()` constructs `bpmn-js/lib/Modeler` itself from the selected engine stack.

### Engine Variants

The modeler supports two Camunda engine variants, selected by the `engine` option:

Each engine stack (`packages/bpmn-modeler/src/engineStacks/c7.ts`, `c8.ts`) is data: the upstream plugin modules in camunda-bpmn-js's former registration order (wrapped by `composeUpstreamModules` with the shared leading/trailing modules), the engine-only modules, the engine moddle extension, and the properties-panel / popup-menu option defaults. `loadEngineStack(engine)` imports it dynamically, so a page only parses the stack it opens.

- **Camunda 7** — `camunda` moddle extension. Engine modules: `CreateAppendElementTemplatesModule`, `CreateAppendC7ElementTemplatesModule`, `TransactionBoundariesModule`.
- **Camunda 8** — `zeebe` moddle extension, `popupMenu.defaultTab`. No engine modules beyond its upstream set.

Both variants share the `commonModules` array in `BpmnModeler.init()` — e.g. `TokenSimulationModule`, `ElementTemplateChooserModule`, `AppendMenuModule`, plus translation, lint, layout, and mode modules. Read the array for the full set.

### Lifecycle

1. `apps/bpmn-webview/src/main.ts` calls `bootstrap(getHostApi(), { extraModules })`; `bootstrap.ts` starts `run()` once the window has loaded
2. `run()` registers the message listener, starts the host theme adapter, resolves the `clipboard` option (see Copy-Paste below), sends `GetBpmnFileCommand` / `GetBpmnModelerSettingCommand` / `GetPropertiesPanelStateCommand`, and awaits the `BpmnFileQuery` (a diff pane branches off to `DiffMode` here)
3. `createModeSession` builds the initial surface: View → `createViewer`, Design on an untagged model → `createDesigner`, otherwise `createModeler` (each lazily imported via `surfaceModules.ts`)
4. `createModeler` constructs `BpmnModeler` and awaits `init()` — load the engine stack, build the module list, install the FEEL/contenteditable clipboard polyfill when `clipboard` is set, then construct `bpmn-js/lib/Modeler` — and afterwards applies the `elementTemplates`, `settings`, `theme`, and `locale` options
5. The webview requests element templates (modeler only) and the lint config (designer/modeler only), then imports the XML via `loadDiagram(xml)` (`newDiagram()` for an empty file)
6. `bindSurface` subscribes `commandStack.changed` to the debounced `SyncDocumentCommand` and creates the `WebviewStateManager`
7. `WebviewStateManager` restores the viewport from `host.getState()`, then — once element templates and settings have arrived — the selection and panel UI state, and finally starts persisting viewport, selection, and drill-down changes

### Modeler Options

`BpmnModeler.init()` passes these options to `new Modeler(...)`:
- `container`: the element passed to `createModeler` (the webview's `#js-canvas`)
- `propertiesPanel`: the stack's `propertiesPanelDefaults`, `parent` from the `propertiesPanel.parent` option (the webview's `#js-properties-panel-mount`), and `feelPopupContainer: container` so FEEL popups stay in the instance's theme scope
- `popupMenu`: the stack's `popupMenuDefaults` (C8 only)
- `alignToOrigin`: `ALIGN_TO_ORIGIN_OPTIONS` — `{ alignOnSave: false, offset: 150, tolerance: 50 }`
- `moddleExtensions`: the stack's extension merged with the caller's `moddleExtensions`
- `propertiesPanelMode`: the normalized `mode` option
- `additionalModules`, in order: upstream (`engineStack.upstreamModules`) → common (`commonModules`) → engine (`engineStack.engineModules`) → capability (`capabilityModules(engine, capabilities)`) → clipboard (`createClipboardModules(...)`, only with a `clipboard` option) → the caller's `additionalModules`

## Core bpmn-js Services

Services are accessed via `modeler.get('serviceName')`. Key services used:

| Service                  | Purpose                                                     |
|--------------------------|-------------------------------------------------------------|
| `eventBus`               | Pub/sub event system — all modeler events flow through this |
| `copyPaste`              | Handles element copy/cut/paste operations on the diagram    |
| `moddle`                 | BPMN model factory — used by the paste reviver to reconstruct typed objects |
| `canvas`                 | Diagram canvas — viewport management, zoom, scroll          |
| `elementTemplatesLoader` | Loads element templates from JSON into the modeler          |
| `alignToOrigin`          | Auto-aligns diagram to canvas origin (configurable)         |
| `transactionBoundaries`  | Shows/hides transaction boundary overlays (C7 only)         |

## EventBus Events

### Events This Project Listens To

| Event                      | Where                                                                    | Purpose                                                                                                          |
|----------------------------|--------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| `commandStack.changed`     | `apps/bpmn-webview/src/bootstrap.ts` (`bindSurface`)                     | Triggered after any modeler command. Exports XML and sends a debounced `SyncDocumentCommand` to host.            |
| `canvas.viewbox.changed`   | `packages/bpmn-modeler/src/viewport.ts`                                  | Triggered on scroll/zoom. Debounced (100ms); `WebviewStateManager` (`state.ts`) persists it via `host.setState()`. |
| `copyPaste.elementsCopied` | `libs/bpmn-clipboard/src/BridgedClipboardModule.ts`                      | Triggered when elements are copied. Intercepted to write descriptor JSON to system clipboard via extension host. |
| `copyPaste.pasteElements`  | `libs/bpmn-clipboard/src/BridgedClipboardModule.ts`                      | Triggered when paste occurs. Intercepted to read descriptor JSON from system clipboard via extension host.       |
| `elementTemplates.errors`  | `packages/bpmn-modeler/src/modeler.ts`                                   | Triggered when element template loading produces errors. Forwarded to the `onElementTemplatesErrors` callback.   |

### Event Priority System

bpmn-js events use a priority system. Higher priority listeners fire first and can prevent lower-priority listeners from executing by returning `false` or calling `event.stopPropagation()`.

- Default priority: `1000`
- The element-clipboard interceptor in `BridgedClipboardModule` uses priority
  **`2051`** — intentionally above `NativeCopyPaste` (priority `2050`)
  to intercept `copyPaste.elementsCopied` / `copyPaste.pasteElements` before the
  default handler runs

## Copy-Paste Architecture (Three Layers)

Copy-paste in this project operates at three distinct layers. The **default is
the native browser clipboard** — the engine stacks and the designer register
`bpmn-js-native-copy-paste`'s `NativeCopyPaste`, so a plain browser (the webview
`serve` preview) needs nothing extra (#1374). The first two layers below are the
**host-bridge override**: bpmn-js DI modules in the shared `libs/bpmn-clipboard`
package (`@miragon/bpmn-modeler-clipboard`), built by its `createClipboardModules({
element, text? })` factory and registered only when the webview can't reach the
system clipboard; the third is a document-level polyfill the package installs outside bpmn-js DI. `resolveClipboard`
in `apps/bpmn-webview/src/session/protocolClipboard.ts` selects between them (native for dev / `clipboard: "native"`, otherwise the
protocol bridge). The two DI modules receive their host bridges through didi
value injection — `elementClipboardBridge` (element JSON) and
`textClipboardBridge` (plain text), each a `{ requestClipboard, writeClipboard }`
pair the factory binds; `text` defaults to `element`. When registered, the
override disables `NativeCopyPaste` (`nativeCopyPaste.toggle(false)`) and takes
over inside the sandboxed VS Code / IntelliJ webview, where the iframe has no
clipboard access.

> Two separate host round-trips: **element** clipboard uses
> `GetClipboardCommand` / `SetClipboardCommand` → `ClipboardQuery`; **text**
> clipboard (labels, FEEL editor) uses `GetTextClipboardCommand` /
> `SetTextClipboardCommand` → `TextClipboardQuery`.

### Layer 1: Diagram Elements (`BridgedClipboardModule`)

Handles copying/pasting of BPMN shapes and connections on the canvas.

**Flow — Copy**:
1. User presses Cmd/Ctrl+C while diagram elements are selected
2. bpmn-js `CopyPaste` module serializes selected elements into a descriptor tree (plain JS objects)
3. `copyPaste.elementsCopied` event fires
4. Our priority-2051 listener intercepts → prefixes the JSON with `"bpmn-js-clip----"` and sends it to the extension host via `SetClipboardCommand`
5. Extension host writes to system clipboard via `vscode.env.clipboard.writeText()`

**Flow — Paste**:
1. User presses Cmd/Ctrl+V while canvas is focused
2. `copyPaste.pasteElements` event fires
3. If `context.tree` already exists (same-editor paste), the interceptor does nothing — bpmn-js handles it internally
4. Otherwise, the interceptor snapshots the current context, returns `false` to cancel the default paste, and sends `GetClipboardCommand` to the extension host
5. Extension host reads system clipboard → responds with clipboard text via `ClipboardQuery`
6. Listener checks for the `"bpmn-js-clip----"` prefix, strips it, and parses the JSON using `createReviver(moddle)` from `bpmn-js-native-copy-paste` — this reviver reconstructs typed BPMN model objects from plain JSON
7. Calls `copyPaste.paste()` with the deserialized tree and the snapshotted context

**Why snapshot the context?** The `return false` in step 4 sets `defaultPrevented: true` on the event context object. Without snapshotting first, the async paste callback would inherit this flag, causing `copyPaste.paste()` to silently abort.

**Why the interceptor?** The webview runs in an iframe without clipboard API access. The extension host mediates clipboard access via `vscode.env.clipboard`.

### Layer 2: Direct-Editing Label Overlays (`LabelClipboardModule`)

Handles copying/pasting text within contenteditable label overlays on the diagram canvas (e.g., when double-clicking a task to edit its name). This targets diagram-js's **direct-editing overlays**, not properties panel inputs — standard INPUT and TEXTAREA elements work natively in VS Code webviews.

**Problem**: diagram-js's `DirectEditing._handleKey` calls `stopPropagation()` on every keydown from the contenteditable overlay. This prevents native clipboard handling from reaching the element. Additionally, VS Code webview iframes lack `clipboard-read`/`clipboard-write` permissions.

**Solution**: `LabelClipboardModule` is a bpmn-js DI module that attaches a **capture-phase** `keydown` listener **on the label element, only while direct editing is active** (scoped tighter than the old document-wide listener). Capture phase fires before bubble phase, so it runs before diagram-js can stop propagation.

```
Capture phase (our listener) → Target → Bubble phase (diagram-js listener)
```

For Cmd/Ctrl+C it reads `window.getSelection()` and writes via the injected `textClipboardBridge.writeClipboard`; for Cmd/Ctrl+V it prevents default, reads via `textClipboardBridge.requestClipboard`, then dispatches a synthetic `ClipboardEvent("paste")`, falling back to `document.execCommand('insertText')` if no handler consumes it.

### Layer 3: FEEL Editor Polyfill + Select-All Guard (`propertiesPanelClipboard.ts`)

The C8 properties panel's FEEL expression editor is **CodeMirror 6**, which lives *outside* the bpmn-js DI context — so the two DI modules above can't reach it. `installContentEditableClipboardPolyfill(roots, { requestClipboard, writeClipboard })` (in `packages/bpmn-modeler/src/propertiesPanelClipboard.ts`, installed by `BpmnModeler.init()` / `BpmnDesigner.init()`) fills that gap: a capture-phase `keydown` listener that bridges Cmd/Ctrl+C/V on any contenteditable/text-editing surface through the host **text** clipboard. It is a per-instance root registry — each `init()` registers its `[container, propertiesPanel.parent]` roots and returns a disposer that `destroy()` (and the next `init()`) calls; the document listeners and the `execCommand` patch install on the first registration and tear down on the last. Clipboard operations resolve against the root containing `document.activeElement`, so sibling instances route to their own bridge. Direct-editing labels (`.djs-direct-editing-content`) are excluded from the capture keydown so `LabelClipboardModule` owns them without a double paste.

It also guards **Cmd/Ctrl+A**: without it, bpmn-js's `Keyboard` service steals Ctrl+A in a text field and selects all diagram shapes. The polyfill lets Ctrl+A select text within the focused editable element (canvas Ctrl+A stays owned by bpmn-js's `SelectionKeyBindings`).

## Element Templates

Element templates are JSON files that define custom property configurations for BPMN elements. They are loaded by:

1. Extension host sends `ElementTemplatesQuery` with template JSON to webview
2. Webview calls `bpmnModeler.setElementTemplates(templates)` → `modeler.get('elementTemplatesLoader').setTemplates(templates)`

The webview's handler, and the report of templates the modeler rejects, live in `apps/bpmn-webview/src/session/surfaceRequests.ts`.

## Modeler Settings

Settings are sent from the extension host as `BpmnModelerSettingQuery`:

- `alignToOrigin`: boolean — enables/disables auto-align to origin on save
- `showTransactionBoundaries`: boolean — shows/hides transaction boundary overlays (C7 only)
- `favouriteBpmnElements`: string[] — BPMN types pinned at the top of the append menu (max 6)

Applied by `apps/bpmn-webview/src/session/surfaceRequests.ts` via `bpmnModeler.setSettings()`, which merges the partial settings and immediately applies transaction boundary visibility for C7 engines using `transactionBoundaries.show()` / `transactionBoundaries.hide()`. The engine-neutral designer (Design on an untagged model) has no `setSettings`: it honours only the favourites, through `setFavouriteBpmnElements()`.

The host sends settings (and `UpdateOpenScriptEditorsQuery`) only on load and on change, so the webview remembers the latest of each in `apps/bpmn-webview/src/hostModelerState.ts`: a modeler a mode switch rebuilds gets the settings through `createModeler({ settings })` and the open-script locks once its import has finished; a rebuilt designer gets the favourites through `createDesigner({ favouriteBpmnElements })`.

## Theme Handling

The BPMN webview themes each modeler **instance** through `@miragon/bpmn-modeler`
([BPMN modeler: themes and locale](../../../docs/adr/bpmn-modeler.md#themes-and-locale)), not by swapping a page stylesheet. The theme CSS (unscoped light base
+ `[data-bpmn-theme="dark"]`-scoped dark overrides) ships inside the main bundle,
and the package toggles a `data-bpmn-theme` attribute on the instance's container
+ properties-panel parent. The shared `libs/shared/src/lib/hostTheme.ts` adapter
resolves the IDE kind from the VS Code body classes (`vscode-dark` /
`vscode-high-contrast`, watched by a `MutationObserver`) and drives both the
page-level scope and the instance's `setTheme`. (DMN uses the same mechanism
through `@miragon/dmn-modeler` with a `data-dmn-theme` attribute — [DMN modeler: themes](../../../docs/adr/dmn-modeler.md#themes).)

## Key Files

- **Public factory**: `packages/bpmn-modeler/src/createModeler.ts`
- **Modeler wrapper** (builds the clipboard modules via `createClipboardModules`): `packages/bpmn-modeler/src/modeler.ts` (engine stacks in `packages/bpmn-modeler/src/engineStacks/`)
- **Webview session**: `apps/bpmn-webview/src/bootstrap.ts` (entry: `main.ts`)
- **Clipboard option** (native, override or host protocol): `apps/bpmn-webview/src/session/protocolClipboard.ts`
- **Lint wiring** (lint options, host lint pushes, config token echo): `apps/bpmn-webview/src/session/lintBridge.ts`
- **Host surface requests** (SVG, format, cleanup, scripts, element templates, settings): `apps/bpmn-webview/src/session/surfaceRequests.ts`
- **Element clipboard module** (priority 2051, `createReviver`): `libs/bpmn-clipboard/src/BridgedClipboardModule.ts` (built via `createClipboardModules`)
- **Label overlay clipboard module**: `libs/bpmn-clipboard/src/LabelClipboardModule.ts`
- **FEEL editor + Ctrl+A polyfill** (per-instance root registry + disposer): `packages/bpmn-modeler/src/propertiesPanelClipboard.ts`
- **Barrel exports**: `apps/bpmn-webview/src/index.ts`
- **Host API wrapper + dev mock** (`getHostApi`/`MockHost`): `apps/bpmn-webview/src/host.ts`
