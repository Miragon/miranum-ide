# Deployment

- Status: accepted
- Last reviewed: 2026-09-18

## Context

Developers deploy related BPMN/DMN files to several environments and need to
share connection definitions without sharing credentials. They also need to
know whether the engine runs the diagram currently in the editor. Local
bookkeeping gives immediate feedback, but shared engines and deployments from
other tools require an explicit reconciliation path.

## Contents

- [Targets and credentials](#targets-and-credentials)
- [Saved-target execution](#saved-target-execution)
- [Freshness ledger](#freshness-ledger)
- [Engine reconciliation](#engine-reconciliation)
- [Alternatives and consequences](#alternatives-and-consequences)

## Decision

### Targets and credentials

Store named targets in `<configFolder>/deployment-targets.json`, defaulting to
`.camunda/deployment-targets.json`. Discover the nearest file by walking from
the focused document toward its workspace root using the shared config-file
discovery helper. Target names are trimmed, non-empty and unique. Parse the
team-editable file defensively and register its
[JSON schema](../../libs/shared/src/lib/deploymentTargets.schema.json)
for editor validation. A malformed file reports an error and yields no targets
rather than crashing the sidebar.

Credentials stay in the host secret store under `<targetsFilePath>::<name>`.
The file path prevents same-named targets in different projects from sharing
credentials in application-scoped IntelliJ PasswordSafe. Optional secret-store
slots retain the legacy unnamed keys when absent; deletion/rename cleans up
the target slot. Never write secrets into the shared file; whole-value
environment references (below) are the only credential values it may hold.

Creating and updating are separate operations so a target is never overwritten
by accident. **New** creates a target from the entered form data and rejects a
name that already exists; **Save** updates the selected target in place and is
disabled when none is selected. A rename onto another existing target's name is
rejected the same way. Both surface a `DuplicateDeploymentTargetError` before
anything is written, so a rejected create or rename leaves the file and secret
store untouched.

Persist the active target name in non-secret host state. The sidebar and
status-bar target picker use the same value. An unresolved persisted name falls
back to ad-hoc mode. With no selected target, preserve the legacy unnamed
connection behavior and write no target file until the user creates a target.

Targets can override complete operation URLs through `endpoints.deploy` and
`endpoints.startInstance`. Substitute a percent-encoded process definition key
for `{processDefinitionKey}` in a start URL. Without overrides use conventional
engine routes. Request bodies remain engine-specific: overrides are for gateways
proxying that API, not a different deployment protocol.

Any connection or auth field may embed `${env:MIRAGON_NAME}` references,
resolved from one `.env` (`EnvScope`): for a named target, the one in the
directory holding its targets file's config folder (`TargetsLocation.projectDir`);
for an ad-hoc request, the one at the document's workspace folder, so a nearer,
possibly vendored targets file can't supply variables for an endpoint the user
typed. Store and display the literal
reference everywhere upstream — secret store, targets file, webview prefill,
target matching — and expand it only when the outbound request is built, inside
the services that issue HTTP requests (`DeploymentService.deploy`/`deployFiles`,
`StartInstanceService.startInstance`, `DeploymentVerificationService.verifyActive`).
The expansion itself lives on the domain objects (`DeploymentConfig`,
`StartInstanceConfig`, `AuthConfig`), which return a request-only copy;
`EnvValueResolver` only builds the variable lookup. Expansion at the last moment
is load-bearing: `persistOnSuccess` writes `config.auth` back to the secret store
and the dispatcher matches the payload against the saved target literally — a
resolved value there would persist a secret in cleartext or freeze it, and would
break target matching. The ledger identity is the exception, see
[Freshness ledger](#freshness-ledger). A missing variable throws
`UnresolvedEnvVariableError` (names the variable, field and the `.env` searched);
it never falls back to the literal. An expanded config is rebuilt through the
same invariants as a typed one, so a variable set to an empty value behaves like
an empty field.

Resolution is scoped because a committed targets file chooses both the
destination and the variables it embeds:

- Only `MIRAGON_`-prefixed names are referenceable, enforced in the reference
  grammar (`envRef.ts`): every `${env:` must open a well-formed, prefixed
  reference, so a foreign or malformed one is rejected when the targets file is
  parsed or a target is saved, and fails the request otherwise. Non-prefixed
  `.env` entries are dropped on read. An open namespace would let a malicious or
  careless targets change send any project secret to its own endpoint.
- The process environment is not a source. It is shared by every project, so a
  globally exported variable would be reachable from any repository's committed
  targets file. This trades away Codespaces/devcontainer-injected variables.
- The `.env` is tied to the targets file, not to the deployed document: a nested
  targets file (a submodule, vendored content) reads its own project's `.env`,
  never the workspace root's, and Deploy Files uses the active target's `.env`
  for files from any folder. Documents outside every workspace folder resolve no
  references — the git-root/document-directory fallback of config discovery could
  otherwise reach a `.env` from an unrelated tree — and neither does a targets
  file that a config folder such as `../x` places outside its project directory.
- A symlinked `.env` is refused (`WorkspacePort.isSymbolicLink`), since a
  repository can commit one pointing at another project's `.env`.
- `.env` is read only when a value contains a reference, so a broken or
  unrelated `.env` (a virtualenv directory) can't fail requests without
  references; an unreadable one fails referencing requests with
  `UnreadableDotEnvError`.
- No resolved value is echoed: `DisallowedEnvReferenceError` names only the
  field (the offending text may be part of a literal secret), and
  `FetchHttpClient` replaces fetch's transport errors, which quote the full URL,
  with `HttpTransportError` naming only the host.

With these limits, a committed targets file can reach exactly the values the
user put into this project's `.env` for the modeler — the same exposure as the
credentials already stored for a target, which also go to whatever endpoint the
file names.

A whole-value env reference is not a secret, so a credential field whose entire
trimmed value is a single prefixed reference is also persisted in the shared
targets file (under `auth.username`/`password`/`clientId`/`clientSecret`, each
schema-pinned to the reference pattern so a literal secret can never validate in;
the parser rejects any other value under these keys, for every auth type).
`CredentialRefs` owns that split. The secret store keeps every value as typed,
refs included: storing a ref overwrites an older literal, and blanking it instead
would break IntelliJ's PasswordSafe, which reads an empty half of a pair back as
absent. On read, file references win over secret-store values and a ref held
only by the store is ignored, so a ref a teammate removed from the file stays
removed (`DeploymentTarget.authWith`); a whole ref is expanded in its trimmed form. A
deploy or start request against a named target must carry exactly the target's
credential refs (`CredentialRefs.admits`): deploy re-saves credentials only to the
secret store, so an edited, added or removed ref would otherwise never reach the
shared file. This lets a teammate clone, add a `.env`, and deploy with no
per-machine credential setup.

Both hosts expose target switching and multi-file deployment. Each selected
`.bpmn`/`.dmn` file is deployed separately, named after the file. The status-bar
item opens the target/verification menu described below.

### Saved-target execution

Connection changes to a named target must be saved before Deploy or Start
Instance. Literal credential edits remain executable; credential environment
references are part of the saved target and must be saved. Both actions share readiness
state and are unavailable during target switches or secret loading.

The core independently resolves the submitted target name within the captured
document context and rejects missing targets or mismatching operation settings
before executing or persisting anything. UI disabling alone cannot establish
which saved destination a request refers to.

Private credential requests/replies carry a monotonically increasing request
ID and the requested target name. Ignore stale replies, including failures;
uncorrelated replies cannot complete the current lookup. Clear secrets when
switching target or authentication method. Target lists carry their document
directory so another document's same-named target cannot inherit a credential
draft. Returning to ad-hoc mode restores all its connection defaults and clears
named-target URL overrides.

Temporary deployment with unsaved connection edits would require a different
identity and credential-persistence policy. Requiring Save keeps the operation
bound to a reviewable target definition.

### Freshness ledger

Record the fingerprint of the bytes successfully deployed, keyed by destination
identity and file, in per-developer host state. The shared targets file describes
connections, not what this machine deployed.

| Field or key | Meaning |
| --- | --- |
| Named destination | `target:<name>@<endpoint-host>` |
| Ad-hoc destination | `adhoc:<endpoint-host>/<tenantId>` |
| With `${env:…}` refs | the resolved host / tenant is stored as `env:<fingerprint>` — a `.env` switch to another engine changes the key, yet no resolved value is ever persisted |
| Ledger key | `<destination-identity>::<filePath>` |
| Revision | `fingerprint`, `deployedAt`, optional `deploymentId`, `origin`, `verifiedAt` |
| Host state key | `bpmn-modeler.deployment.ledger` in VS Code workspace state / IntelliJ PropertiesComponent |

Fingerprints normalize line endings and concatenate two independently seeded
32-bit FNV-1a hashes as a 16-digit hex value. This is a portable content-change
check, without `node:crypto`. Compare against the current editor buffer, not
just disk: a dirty buffer correctly differs from deployed saved bytes.

| Freshness | Interpretation |
| --- | --- |
| `unknown` (default/gray) | No matching local ledger row; not proof of absence on the engine |
| `deployed` (green) | Editor fingerprint matches the recorded revision |
| `changed` (yellow) | Editor differs from a locally deployed revision |
| `superseded` (blue) | Editor differs from a revision adopted from the engine |

`DeploymentStatusService` owns ledger recording and the freshness indicator;
`DeploymentTargetService` owns target files and credentials. Refresh on deploy,
editor focus and debounced document edits. The bridge listens to its document
mirror for edit-time refresh. Active target and ledger getters follow the
[synchronous mirror contract](architecture-and-hosts.md#host-replicated-state)
and are included in startup/restart seeds.

### Engine reconciliation

Verification runs on demand through a command or the status-bar menu, never on
open, edit or a timer. Local feedback therefore needs no network access and
does not produce background authentication errors against sleeping engines.

A separate `EngineInspectionPort.fetchLatestDefinition` is implemented by the
Camunda 7 client. C8 has no verification menu entry and its command reports the
operation unavailable; there is no unsupported engine-router stub. Lookups use
the plain REST base URL, not the deployment URL override. Adding C8 inspection
would require a separate capability such as Operate and its authentication.

Reconciliation compares the stored row, editor content and fingerprint of the
engine's latest XML. A current revision gains `verifiedAt`; a matching engine
revision can seed an absent local row; a differing engine revision is adopted
with `origin: "engine"`, producing blue freshness; an absent engine definition
removes the row. A subsequent local deploy writes a local-origin row. Missing
`origin` on older rows means local, preserving their interpretation.

Named identity includes endpoint host so changing that host invalidates old
rows. Target rename/delete prunes its ledger keys. Older name-only keys no
longer match and show unknown until verification or deployment seeds a current
row. This accepted reset avoids reusing a misleading green indicator.

The inspection service is separate from local status refresh. Protocol additions
for verification, status menus, ledger persistence/pruning and `verifiedAt`
belong to the private bridge contract; both hosts render the same freshness
states and timestamps.

## Alternatives and consequences

- Host-specific settings profiles cannot provide the same team-shareable,
  host-neutral connection file. A base URL alone cannot express gateways that
  rewrite entire operation paths.
- The local ledger can drift when another developer deploys or an engine is
  reset. On-demand verification repairs it without promising continuously
  verified engine state. A different path on the same endpoint host is not a
  distinct named ledger identity under the current scheme.
- The ledger belongs to one developer, so fresh clones initially show unknown;
  verification can adopt a matching engine revision. File renames likewise
  change the key.
- Credentials remain private while connection definitions are reviewable.
  Saving target metadata is an intentional additional step before execution.
- Environment references trade convenience for containment: no process-env or
  Codespaces variables, a mandatory `MIRAGON_` prefix (existing `CAMUNDA_*`
  entries must be duplicated), literal values may not contain `${env:`, and a
  targets file carrying a literal under a credential key no longer loads. The
  [envRef tests](../../libs/modeler-core/src/deployment/domain/envRef.spec.ts)
  pin the grammar and a schema parity spec keeps the JSON schema patterns in step.
- Core target validation and webview regression tests cover stale replies,
  readiness and context changes; [deployment tests](../../libs/modeler-core/src/deployment)
  cover identity, freshness and reconciliation, and the
  [bridge contract tests](../../apps/modeler-bridge/src/protocol/protocol.spec.ts)
  guard both peers' protocol agreement.
