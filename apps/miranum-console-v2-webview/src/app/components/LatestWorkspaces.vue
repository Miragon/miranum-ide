<script lang="ts" setup>
import { computed } from "vue";
import { Workspace } from "@miranum-ide/vscode/miranum-vscode-webview";

import WorkspaceIcon from "./WorkspaceIcon.vue";

interface Props {
    workspaces: Workspace[];
}

const props = defineProps<Props>();
const emits = defineEmits(["openProject"]);

const workspaces = computed(() => props.workspaces);

const openProject = (project: Workspace) => {
    emits("openProject", project);
};
</script>

<template>
    <div class="container">
        <h3><span>Recent Projects</span></h3>
        <ul>
            <li
                v-for="workspace in workspaces"
                :key="`${workspace.path}/${workspace.name}`"
                @click="openProject(workspace)"
            >
                <div class="item">
                    <WorkspaceIcon :projectName="workspace.name" />
                    <p class="name">{{ workspace.name }}</p>
                    <p class="path">{{ workspace.path }}</p>
                </div>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.container {
    width: 60%;
    overflow: hidden;
    margin: 0 auto;
}

h3 {
    margin: 0;
}

ul {
    max-height: 280px;
    padding: 8px;
    list-style-type: none;
    overflow: auto;
}

li {
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
}

li:hover {
    background-color: #f0f0f0;
}

.item {
    display: grid;
    grid-template-columns: 60px minmax(auto, 280px) 1fr;
    align-items: center;
}

.name {
    font-size: 16px;
}

.path {
    font-size: 12px;
    color: #666;
}
</style>
