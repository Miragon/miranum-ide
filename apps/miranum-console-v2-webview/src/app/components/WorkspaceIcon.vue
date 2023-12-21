<script lang="ts" setup>
interface Props {
    projectName: string;
}

const props = defineProps<Props>();

const initials = props.projectName.slice(0, 2).toUpperCase();

const colors = [
    "#8B4A77",
    "#486144",
    "#4A5A8B",
    "#615944",
    "#A16E48",
    "#ACD8DD",
    "#C1E3C1",
];

const hash = hashString(props.projectName);

const color = colors[mapToRange(hash, colors.length)];

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function mapToRange(hash: number, range: number) {
    return Math.abs(hash % range);
}
</script>

<template>
    <div :style="{ background: color }">
        <p>{{ initials }}</p>
    </div>
</template>

<style scoped>
div {
    width: 32px;
    height: 32px;
    font-size: 16px;
    padding: 4px;
    border-radius: 25%;
    background-color: #f0f0f0;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #333;
    border: 1px solid black;
}
</style>
