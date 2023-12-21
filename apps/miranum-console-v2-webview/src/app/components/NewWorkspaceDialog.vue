<script lang="ts" setup>
import { computed, ref } from "vue";
import { Artifact, Engine, Workspace } from "@miranum-ide/vscode/miranum-vscode-webview";
import { NewWorkspace } from "../types";

interface Props {
    path: string;
}

const props = defineProps<Props>();
const emits = defineEmits(["closeDialog", "createProject", "openFilePicker"]);

const workspaceName = ref<string>();
const workspacePath = computed(() => props.path);
const artifacts = ref(new Set<Artifact>());
const engine = ref<Engine>(Engine.C7); // if this gets changed, the default checked radio button has to be changed as well

const createProject = () => {
    console.log("createProject", workspaceName.value, workspacePath.value);
    if (!workspaceName.value || !workspacePath.value) {
        // TODO: style the input fields accordingly
        return;
    }

    const workspace = new NewWorkspace(
        new Workspace(workspaceName.value, workspacePath.value),
        artifacts.value,
        engine.value,
    );

    emits("createProject", { project: workspace });
};
const addOrDeleteCheckbox = (value: Artifact) => {
    if (artifacts.value.has(value)) {
        artifacts.value.delete(value);
        return;
    }
    artifacts.value.add(value);
};
</script>

<template>
    <div class="modal-backdrop">
        <div class="modal">
            <div class="header">
                <h2>Create New Project</h2>
            </div>
            <div class="body">
                <div class="project-input">
                    <vscode-text-field
                        label="Project Name"
                        placeholder="Project Name"
                        @input="(event) => (workspaceName = event.target.value)"
                    ></vscode-text-field>
                    <div class="input-path">
                        <vscode-text-field
                            :value="props.path"
                            label="Project Path"
                            placeholder="Project Path"
                            @input="(event) => (workspacePath = event.target.value)"
                        ></vscode-text-field>
                        <vscode-button
                            appearance="icon"
                            @click="$emit('openFilePicker')"
                        >
                            <span class="codicon codicon-folder-opened"></span>
                        </vscode-button>
                    </div>
                </div>
                <fieldset>
                    <legend>Select artifacts</legend>
                    <vscode-checkbox @change="addOrDeleteCheckbox(Artifact.DMN)">
                        DMN
                    </vscode-checkbox>
                    <vscode-checkbox
                        @change="addOrDeleteCheckbox(Artifact.ELEMENT_TEMPLATE)"
                    >
                        Element Template
                    </vscode-checkbox>
                    <vscode-checkbox @change="addOrDeleteCheckbox(Artifact.FORM)">
                        Form
                    </vscode-checkbox>
                </fieldset>
                <fieldset>
                    <legend>Select the Workflow Engine</legend>
                    <vscode-radio-group orientation="horizontal">
                        <vscode-radio checked value="c7" @click="engine = Engine.C7">
                            Camunda 7
                        </vscode-radio>
                        <vscode-radio value="c8" @click="engine = Engine.C8">
                            Camunda 8
                        </vscode-radio>
                    </vscode-radio-group>
                </fieldset>
            </div>
            <div class="footer">
                <vscode-button appearance="secondary" @click="$emit('closeDialog')">
                    Cancel
                </vscode-button>
                <vscode-button appearance="primary" @click="createProject">
                    Create
                </vscode-button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modal-backdrop {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal {
    background: var(--vscode-editor-background);
    box-shadow: 2px 2px 20px 8px var(--vscode-editorInfo-foreground);
    overflow-x: auto;
    display: flex;
    flex-direction: column;
}

.header,
.footer {
    padding: 15px;
    display: flex;
}

.header {
    position: relative;
    border-bottom: 1px solid #eeeeee;
    color: var(--vscode-editorInfo-foreground);
    justify-content: space-between;
}

.footer {
    display: flex;
    justify-content: end;
}

.footer > vscode-button {
    width: 80px;
    margin-left: 8px;
}

.body {
    position: relative;
    padding: 20px 10px;
}

.project-input {
    display: flex;
    flex-direction: column;
    margin-bottom: 20px;
}

.project-input > vscode-text-field {
    margin-bottom: 18px;
    width: 380px;
}

.project-input > vscode-text-field > #id {
    height: 80px;
}

.input-path {
    display: flex;
}

.input-path > vscode-text-field {
    width: 350px;
}

.input-path > vscode-button {
    width: 26px;
    height: 26px;
    margin-left: 4px;
}

.body fieldset {
    display: flex;
    flex-direction: column;
    margin: 18px 0;
}
</style>
