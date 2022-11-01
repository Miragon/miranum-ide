# digiwf-lib

## Getting started

```typescript
import { DigiwfLib } from "@lmoesle/digiwf-lib";

const digiwfLib = new DigiwfLib();

digiwfLib.deployArtifact("my-process.bpmn", "bpmn", "my-awesome-project", "local")
    .then(success => console.log(success));
```

## Deployment Artifacts

```typescript
import { DigiwfLib } from "@lmoesle/digiwf-lib";

const digiwfLib = new DigiwfLib();

digiwfLib.deployArtifact("my-process.bpmn", "bpmn", "my-awesome-project", "local")
    .then(success => console.log(success));
```

**Available Deployment Plugins**

* `dry` for testing purposes
* `rest` deploys artifacts via http requests

**Custom Deployment Plugins**

```typescript
import { DigiwfLib, Success } from "@lmoesle/digiwf-lib";

// create your own deployment plugin
const dryPlugin = {
    name: "dry",
    targetEnvironments: [{name:"local",url:"http://localhost:8080"}],
    deploy: function(target: string) {
        return new Promise<Success>(resolve => resolve({
            success: true,
            message: `Deployed to ${target}`
        }));
    }
};

// create a custom config
const customConfig = {
    deploymentPlugins: [
        dryPlugin
    ]
}

// pass your config to DigiwfLib
const digiwfLib = new DigiwfLib(customConfig);

// use DigiwfLib
digiwfLib.deployArtifact("my-process.bpmn", "bpmn", "test-project", "local")
    .then(success => console.log(success))
    .catch(error => console.error(error));
```

## Generate Artifacts

tbd.
