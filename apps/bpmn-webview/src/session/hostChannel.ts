import type { Command, HostApi, Query } from "@miragon/bpmn-modeler-shared";

import type { WebviewState } from "../webviewState";

export type HostChannel = Pick<HostApi<WebviewState, Command | Query>, "postMessage">;
