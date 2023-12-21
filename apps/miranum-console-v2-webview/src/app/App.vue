<script lang="ts" setup>
import { onBeforeMount, ref } from "vue";
import {
    provideVSCodeDesignSystem,
    vsCodeButton,
    vsCodeCheckbox,
    vsCodeRadio,
    vsCodeRadioGroup,
    vsCodeTextField,
} from "@vscode/webview-ui-toolkit";
import {
    CreateNewWorkspaceCommand,
    GetLatestWorkspaceCommand,
    GetPathForNewWorkspaceCommand,
    LatestWorkspaceQuery,
    LogErrorCommand,
    LogInfoCommand,
    MiranumConsoleQuery,
    NewWorkspacePathQuery,
    OpenWorkspaceCommand,
    OpenWorkspaceDialogCommand,
    Workspace,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import NewWorkspaceDialog from "./components/NewWorkspaceDialog.vue";
import LatestWorkspaces from "./components/LatestWorkspaces.vue";

import { MissingStateError, VsCode, VsCodeImpl, VsCodeMock } from "./vscode";
import { createResolver } from "./utils";
import { NewWorkspace } from "./types";

provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeRadio(),
    vsCodeRadioGroup(),
    vsCodeCheckbox(),
    vsCodeTextField(),
);
declare const process: { env: { NODE_ENV: string } };
const latestProjectResolver = createResolver<Workspace[]>();

let vscode: VsCode;
if (process.env.NODE_ENV === "development") {
    vscode = new VsCodeMock();
    console.log("Running in development mode.");
} else {
    vscode = new VsCodeImpl();
    console.log("Running in production mode.");
}

const isDialogVisible = ref(false);
const latestWorkspaces = ref<Workspace[]>([]);
const workspacePath = ref("");

const createProject = (newWorkspace: NewWorkspace) => {
    const msg = new CreateNewWorkspaceCommand(
        newWorkspace.workspace,
        Array.from(newWorkspace.artifacts),
        newWorkspace.engine,
    );
    vscode.postMessage(msg);
};
const openFilePicker = (event: string) => {
    switch (event) {
        case "openWorkspaceDialog":
            vscode.postMessage(new OpenWorkspaceDialogCommand());
            break;
        case "getPath":
            vscode.postMessage(new GetPathForNewWorkspaceCommand());
            break;
    }
};
const openProject = (project: Workspace) => {
    vscode.postMessage(new OpenWorkspaceCommand(project));
};

onBeforeMount(async () => {
    window.addEventListener("message", receiveMessage);

    try {
        const state = vscode.getState();
        latestWorkspaces.value = state.latestProjects;
    } catch (error) {
        if (error instanceof MissingStateError) {
            vscode.postMessage(new GetLatestWorkspaceCommand());

            const projects = await latestProjectResolver.wait();

            if (projects) {
                latestWorkspaces.value = projects;

                vscode.setState({
                    latestProjects: projects,
                });
            }

            vscode.postMessage(new LogInfoCommand("Webview is initialized."));
        } else {
            const message = error instanceof Error ? error.message : `${error}`;
            vscode.postMessage(new LogErrorCommand(message));
        }
    }
});

function receiveMessage(message: MessageEvent<MiranumConsoleQuery>) {
    const query = message.data;

    switch (true) {
        case query instanceof LatestWorkspaceQuery: {
            const latestProjects: Workspace[] = (query as LatestWorkspaceQuery)
                .latestWorkspaces;

            latestProjectResolver.done(latestProjects);
            break;
        }
        case query instanceof NewWorkspacePathQuery: {
            workspacePath.value = (query as NewWorkspacePathQuery).path;
            break;
        }
    }
}
</script>

<template>
    <div id="app">
        <div class="header">
            <img alt="Miranum logo" class="logo" src="@/assets/logo.png" />
            <h1>Miranum IDE</h1>
        </div>

        <div class="actions">
            <!--<button class="btn-new" @click="isDialogVisible = true">New</button>
            <button class="btn-open" @click="openFilePicker">Open</button>-->
            <vscode-button appearance="primary" @click="isDialogVisible = true">
                New
            </vscode-button>
            <vscode-button appearance="secondary" @click="openFilePicker('openProject')">
                Open...
            </vscode-button>
        </div>

        <NewWorkspaceDialog
            v-show="isDialogVisible"
            :path="workspacePath"
            @closeDialog="isDialogVisible = false"
            @createProject="createProject"
            @openFilePicker="openFilePicker('getPath')"
        />

        <LatestWorkspaces :workspaces="latestWorkspaces" @open-project="openProject" />
    </div>
</template>

<style scoped>
#app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding-top: 80px;
    background: var(--vscode-editor-background);
    font-family: "Roboto", sans-serif;
}

.header {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin: 16px;
}

.logo {
    width: 80px;
}

vscode-button {
    height: 60px;
    width: 180px;
    margin: 10px;
}

.actions {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin: 40px 0 70px 0;
}
</style>
