# miranum-core

**Features**

- Generates process artifacts and automation projects
- Defines a standard structure for automation projects
- Deploys artifacts to your digiwf instance

- [documentation](https://github.com/FlowSquad/miranum-ide/tree/main/docs)
- [examples](https://github.com/FlowSquad/miranum-ide-examples)

## Getting started

```
npm install @miragon/miranum-core
```

```typescript
import { createDigiwfLib } from "@miragon/miranum-core";
import { MiranumDeploymentPluginRest } from "./miranum-deployment-plugin-rest";

// init miranum-core
const digiwfLib = createDigiwfLib("1.0.0", "my-awesome-project", {
    "forms": "forms",
    "elementTemplates": "element-templates",
    "configs": "configs"
}, [new MiranumDeploymentPluginRest("rest", [
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

- [documentation](https://github.com/FlowSquad/miranum-ide/tree/main/docs)
- [examples](https://github.com/FlowSquad/miranum-ide-examples)
