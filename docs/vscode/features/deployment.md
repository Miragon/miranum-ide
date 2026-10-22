# Deployment

Deploy BPMN and DMN files to Camunda 7 or Camunda 8 and start process instances from VS Code.

## The Deploy sidebar

Open the **Deploy Diagram** view from the rocket icon in the activity bar. It has two tabs:

- **Deploy** uploads the diagram, optionally with additional files.
- **Start Instance** starts a process instance, optionally with a JSON payload.

Fill in engine, endpoint, tenant and authentication, then deploy. For a quick deploy of the open diagram use the rocket button in the editor title bar.

## Authentication

| Mode | Sends |
|---|---|
| **None** (default) | No auth header, for local engines |
| **Basic Auth** | `Authorization: Basic …` from username and password |
| **OAuth2 Client Credentials** | `Authorization: Bearer …`, fetched from the token endpoint, with optional `audience` |

Credentials are kept in VS Code's encrypted secret storage, never in files.

## Deployment targets

A target is a saved, named connection you can reuse and share with your team. Targets live in `<configFolder>/deployment-targets.json` (`.camunda/deployment-targets.json` by default); the nearest file from the diagram up to the workspace root wins. The file has a JSON schema, so the editor completes and validates it.

```json
{
  "targets": [
    {
      "name": "dev",
      "engine": "c7",
      "endpoint": "http://localhost:8080/engine-rest",
      "tenantId": "",
      "auth": { "type": "oauth2", "tokenEndpoint": "https://login.example.com/oauth/token", "audience": "" },
      "endpoints": {
        "deploy": "https://gw.example.com/camunda/deploy",
        "startInstance": "https://gw.example.com/camunda/{processDefinitionKey}/start"
      }
    }
  ]
}
```

- `name` is unique. `engine` is `c7` or `c8`. `auth.type` is `none`, `basic` or `oauth2`.
- `endpoints` is optional. Use it when a gateway exposes custom routes: the request goes to that URL with the same body, and `{processDefinitionKey}` is filled in.

**Manage targets in the sidebar.** Pick a target above **Connection**, then use **New** (create from the form, rejects existing names), **Save** (update the selected target, including a rename) or **Delete**. **Edit JSON** opens the file. Save connection changes before you deploy; credential changes apply at once. With no target selected (the first entry, which uses the form values), the form is stored per workspace and nothing is written to the file.

## Status bar and freshness

The status bar shows the active target with a coloured dot. Click it to switch targets or, for Camunda 7, verify against the engine.

| Dot | Meaning |
|---|---|
| Green | The diagram matches your last deployment to this target. |
| Yellow | The diagram changed since then, including unsaved edits (deploy sends the saved file). |
| Blue | Verification found a different version on the engine. |
| Gray | This machine has never deployed this file to this target. |

Freshness is recorded locally per target and file, not on the engine and not in `deployment-targets.json`. **Verify Deployment on Engine** (Camunda 7 only) compares with the engine's latest version: green if it matches, blue if not. It uses the plain endpoint, not the `endpoints.deploy` override.

## Commands

| Command | Use |
|---|---|
| **Miragon BPMN Modeler: Deploy Diagram** | Save and deploy the open diagram to the active target. Additional files need the sidebar. |
| **Miragon BPMN Modeler: Deploy Files…** | Deploy several `.bpmn`/`.dmn` files, one deployment each. Also in the Explorer context menu. |
| **Miragon BPMN Modeler: Switch Deployment Target** | Pick the active target or ad-hoc form values. |
| **Miragon BPMN Modeler: Verify Deployment on Engine** | Check the open diagram against a Camunda 7 engine. |

## Payload files

Process variables for **Start Instance** come from `.json` files under `<configFolder>/payloads/`. The modeler collects them from the diagram's folder up to the workspace root (nearest first) and lets you pick one.

```
my-project/
├── .camunda/payloads/default-vars.json      # every diagram
└── processes/
    ├── .camunda/payloads/order-vars.json    # diagrams in processes/
    └── order-process.bpmn
```

The file is sent as `variables` unchanged, so it must match the engine:

```jsonc
// Camunda 8
{ "amount": 1500, "customerId": "cust-42" }
```

```jsonc
// Camunda 7
{ "amount": { "value": 1500 }, "customerId": { "value": "cust-42", "type": "String" } }
```

See the [Camunda 7 REST API](https://docs.camunda.org/rest/camunda-bpm-platform/7.22/#tag/Process-Definition/operation/startProcessInstanceByKey) for the Camunda 7 variable format.

## Endpoints and settings

| Engine | Deploy | Start instance |
|---|---|---|
| Camunda 7 | `POST {endpoint}/deployment/create` | `POST {endpoint}/process-definition/key/{key}/start` |
| Camunda 8 | `POST {endpoint}/{apiVersion}/deployments` | `POST {endpoint}/{apiVersion}/process-instances` |

| Setting | Default | Description |
|---|---|---|
| `miragon.bpmnModeler.configFolder` | `.camunda` | Folder searched for targets and payloads. |
| `miragon.bpmnModeler.c8ApiVersion` | `v2` | API version for Camunda 8 endpoints. |

## Next steps

- [Linting](/vscode/features/linting): catch what the engine cannot run before you deploy.
- [BPMN diff](/vscode/features/bpmn-diff): review what changed before you deploy.
- [Configuration](/vscode/configuration): the config folder and Camunda 8 API version.
