# `@miragon/bpmn-modeler-element-template-chooser`

Replaces `@bpmn-io/element-template-chooser` with a richer overlay for picking
an element template. When the user clicks **Select** in the properties panel's
template section, a modal opens with a searchable, category-filterable template
list on the left and a live detail preview on the right (description,
documentation link, and a breakdown of inputs / outputs / properties), with
keyboard navigation and apply-on-Enter/double-click.

## How it works

`ElementTemplateChooserModule` registers the `elementTemplateChooser` bpmn-js
DI service. It listens for the properties panel's `elementTemplates.select`
event, asks `elementTemplates.getLatest(element)` for the applicable (not
already applied) templates, renders the Preact overlay into a `position: fixed`
container mounted on the canvas parent, and on confirm calls
`elementTemplates.applyTemplate(element, template)`. Property bindings are
classified (`classifyBinding`) and the implementation summary is derived
(`extractImplementationDetail`) for both Camunda 7 (`camunda:topic`,
`camunda:class`, …) and Camunda 8 (`zeebe:taskDefinition:type`, …) shapes.

## Why this lives in its own library

- **It is a self-contained properties-panel integration.** All it needs from the
  host is the bpmn-js `elementTemplates` service; keeping it separate keeps the
  overlay reusable in any bpmn-js application and lets its UX evolve
  independently. `@miragon/bpmn-modeler` registers it in the `commonModules` of
  `packages/bpmn-modeler/src/modeler.ts` (both engines) and inlines this
  private, source-only package into its bundle
  (`packages/bpmn-modeler/inlined-libraries.json`).
- **Its template types are shared.** `append-menu` reuses the `ElementTemplate`
  types. It is reachable from the engine-neutral `/design` entry, so its value
  imports target chooser subpaths (e.g. `/types`), never the barrel, which pulls
  in the DI module, minisearch, and the CSS
  (`packages/bpmn-modeler/src/architecture.spec.ts`).

## Usage

`@miragon/bpmn-modeler` already registers the module. On a plain bpmn-js
`Modeler`, add it next to the properties panel and an element-templates module
that provides `elementTemplates`. The Camunda 7 templates module below also
needs the Camunda moddle extension (on Camunda 8, use
`CloudElementTemplatesPropertiesProviderModule` with the Zeebe extension):

```ts
import Modeler from "bpmn-js/lib/Modeler";
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from "bpmn-js-properties-panel";
import { ElementTemplatesPropertiesProviderModule } from "bpmn-js-element-templates";
import camundaModdle from "camunda-bpmn-moddle/resources/camunda.json";
import { ElementTemplateChooserModule } from "@miragon/bpmn-modeler-element-template-chooser";

new Modeler({
    container: "#canvas",
    propertiesPanel: { parent: "#js-properties-panel" },
    moddleExtensions: { camunda: camundaModdle },
    additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        ElementTemplatesPropertiesProviderModule,
        ElementTemplateChooserModule,
    ],
});
```

The DI container wires the service automatically; it subscribes to
`elementTemplates.select` and shows the overlay when the properties panel's
template **Select** button is pressed.
