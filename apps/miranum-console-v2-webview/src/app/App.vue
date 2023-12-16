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
import NewProjectDialog from "./components/NewProjectDialog.vue";
import LatestProjects from "./components/LatestProjects.vue";

import { MissingStateError, VsCode, VsCodeImpl, VsCodeMock } from "./vscode";
import { createResolver } from "./utils";
import { ConsoleMessageType, MiranumConsoleDto, NewProject, Project } from "./types";
import {
    LoggerMessage,
    MessageType,
    VscMessage,
} from "@miranum-ide/vscode/miranum-vscode-webview";

provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeRadio(),
    vsCodeRadioGroup(),
    vsCodeCheckbox(),
    vsCodeTextField(),
);
declare const process: { env: { NODE_ENV: string } };
const latestProjectResolver = createResolver<Project[]>();

let vscode: VsCode;
if (process.env.NODE_ENV === "development") {
    vscode = new VsCodeMock();
    console.log("Running in development mode.");
} else {
    vscode = new VsCodeImpl();
    console.log("Running in production mode.");
}

const isDialogVisible = ref(false);
const latestProjects = ref<Project[]>([]);
const projectPath = ref("");

const createProject = (project: NewProject) => {
    vscode.postMessage(
        new MiranumConsoleDto(ConsoleMessageType.CREATE_PROJECT, undefined, project),
    );
};
const openFilePicker = (event: string) => {
    switch (event) {
        case "openProject":
            vscode.postMessage(
                new MiranumConsoleDto(ConsoleMessageType.OPEN_FILE_PICKER),
            );
            break;
        case "getPath":
            vscode.postMessage(new MiranumConsoleDto(ConsoleMessageType.GET_PATH));
            break;
    }
};
const openProject = (project: Project) => {
    vscode.postMessage(new MiranumConsoleDto(ConsoleMessageType.OPEN_PROJECT, project));
};

onBeforeMount(async () => {
    window.addEventListener("message", receiveMessage);

    try {
        const state = vscode.getState();
        latestProjects.value = state.latestProjects;
    } catch (error) {
        if (error instanceof MissingStateError) {
            vscode.postMessage(new MiranumConsoleDto(MessageType.INITIALIZE));

            const projects = await latestProjectResolver.wait();

            if (projects) {
                latestProjects.value = projects;

                vscode.setState({
                    latestProjects: projects,
                });
            }

            vscode.postMessage(
                new LoggerMessage(MessageType.INFO, "Webview is initialized."),
            );
        } else {
            const message = error instanceof Error ? error.message : `${error}`;
            vscode.postMessage(new LoggerMessage(MessageType.ERROR, message));
        }
    }
});

function receiveMessage(message: MessageEvent<VscMessage<Project | string>>) {
    const vscMessage = message.data;

    const type = vscMessage.type;

    switch (type) {
        case MessageType.INITIALIZE: {
            // TODO: Handle error when parsing fails
            const latestProjects: Project[] = vscMessage.data
                ? JSON.parse(vscMessage.data)
                : undefined;
            latestProjectResolver.done(latestProjects);
            break;
        }
        case ConsoleMessageType.GET_PATH: {
            projectPath.value = vscMessage.data ?? "";
            break;
        }
    }
}
</script>

<template>
    <div id="app">
        <div class="header">
            <img alt="Miranum logo" class="logo" src="../assets/logo.png" />
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

        <NewProjectDialog
            v-show="isDialogVisible"
            :path="projectPath"
            @closeDialog="isDialogVisible = false"
            @createProject="createProject"
            @openFilePicker="openFilePicker('getPath')"
        />

        <LatestProjects :projects="latestProjects" @open-project="openProject" />
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
