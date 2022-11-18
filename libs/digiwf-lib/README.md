# digiwf-lib

**Features**

- Generates process artifacts and automation projects
- Defines a standard structure for automation projects
- Deploys artifacts to your digiwf instance

- [documentation](https://github.com/FlowSquad/miragon-process-ide/tree/main/docs)
- [examples](https://github.com/FlowSquad/miragon-process-ide-examples)

## Getting started

```
npm install @miragon/digiwf-lib
```

```typescript
import { createDigiwfLib } from "@miragon/digiwf-lib";
import { DigiwfDeploymentPluginRest } from "./digiwf-deployment-plugin-rest";

// init digiwf-lib
const digiwfLib = createDigiwfLib("1.0.0", "my-awesome-project", {
    "forms": "forms",
    "elementTemplates": "element-templates",
    "processConfigs": "configs"
}, [new DigiwfDeploymentPluginRest("rest", [
    {
        "name": "dev",
        "url": "http://localhost:8080"
    }
])]);

const myArtifact = {
    type: "bpmn",
    "project": "my-awesome-project",
    file: {
        name: "my-process",
        extension: "bpmn",
        content: "..."
    }
}; 
    
// deploy file
digiwfLib.deploy("dev", myArtifact)
    .then(success => console.log(success));

// generate new project
digiwfLib.initProject("my-awesome-project")
    .then(artifacts => console.log(artifacts));

// generate new file
digiwfLib.generateArtifact("my-process", "bpmn", "my-awesome-project")
    .then(artifact => console.log(artifact));
```

## More Information

Checkout our

- [documentation](https://github.com/FlowSquad/miragon-process-ide/tree/main/docs)
- [examples](https://github.com/FlowSquad/miragon-process-ide-examples)
