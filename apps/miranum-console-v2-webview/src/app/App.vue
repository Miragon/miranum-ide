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
    GetImagePathCommand,
    GetLatestWorkspaceCommand,
    GetPathForNewWorkspaceCommand,
    ImagePath,
    ImagePathQuery,
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
import miranumLogo from "../assets/logo.png";

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
const latestWorkspacesResolver = createResolver<Workspace[]>();
const imagePathResolver = createResolver<ImagePath[]>();

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
const miranumLogoUrl = ref<any>(miranumLogo);

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
            vscode.postMessage(new GetImagePathCommand());

            const [images, workspaces] = [
                await imagePathResolver.wait(),
                await latestWorkspacesResolver.wait(),
            ];

            if (images) {
                for (const image of images) {
                    if (image.id === "miranumLogo") {
                        miranumLogoUrl.value = image.path;
                    }
                }
            }
            if (workspaces) {
                latestWorkspaces.value = workspaces;
            }

            vscode.setState({
                images: images ?? [],
                latestProjects: workspaces ?? [],
            });

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
        case query.type === "LatestWorkspaceQuery": {
            const latestProjects: Workspace[] = (query as LatestWorkspaceQuery)
                .latestWorkspaces;
            latestWorkspacesResolver.done(latestProjects);
            break;
        }
        case query.type === "ImagePathQuery": {
            const images: ImagePath[] = (query as ImagePathQuery).images;
            imagePathResolver.done(images);
            break;
        }
        case query.type === "NewWorkspacePathQuery": {
            workspacePath.value = (query as NewWorkspacePathQuery).path;
            break;
        }
    }
}
</script>

<template>
    <div id="app">
        <div class="header">
            <img :src="miranumLogoUrl" alt="Miranum logo" class="logo" />
            <h1>Miranum IDE</h1>
        </div>

        <div class="actions">
            <vscode-button appearance="primary" @click="isDialogVisible = true">
                New
            </vscode-button>
            <vscode-button
                appearance="secondary"
                @click="openFilePicker('openWorkspaceDialog')"
            >
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
