# miranum-create-append-c7-element-templates

## Features

* Extend the element templates module
* Use the create/append pattern for Camunda 7 Element Templates
* You can try this out with the [Miranum Modeler](https://marketplace.visualstudio.com/items?itemName=miragon-gmbh.vs-code-bpmn-modeler) within `VS Code`

> Note: This plugin extends the bpmn-js plugins for [element templates](https://www.npmjs.com/package/bpmn-js-element-templates)
> and [create/append anything](https://www.npmjs.com/package/bpmn-js-create-append-anything).

<p>
    <img src="https://github.com/Miragon/miranum-ide/blob/200c715ca6f091e06117cfbd04aa01630f633c33/libs/miranum-create-append-c7-element-templates/assets/example.gif?raw=true" alt="example.gif" width="700" /><br>
    <em>Example created with the VS Code Plugin `Miranum Modeler`</em>
</p>

## Usage

```shell
npm install @miragon/miranum-create-append-element-templates
```

```javascript
// Import element templates
import {
    ElementTemplatesPropertiesProviderModule
} from 'bpmn-js-element-templates';
// Import create/append anything
import {
  CreateAppendAnythingModule,
  CreateAppendElementTemplatesModule
} from 'bpmn-js-create-append-anything';

import { ExtendElementTemplates } from '@miragon/miranum-create-append-c7-element-templates'

const modeler = new BpmnModeler({
    additionalModules: [
        ...,
        ElementTemplatesPropertiesProviderModule,
        ExtendElementTemplates,
        CreateAppendAnythingModule,
        CreateAppendElementTemplatesModule,
    ]
});
```
