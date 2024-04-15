<script lang="ts" setup>
import { onBeforeMount, onUnmounted, ref, toRaw } from "vue";
import { debounce } from "lodash";
import {
    type JsonFormsRendererRegistryEntry,
    type JsonSchema,
    type UISchemaElement,
} from "@jsonforms/core";
import { vuetifyRenderers } from "@jsonforms/vue-vuetify";
import { vanillaRenderers } from "@jsonforms/vue-vanilla";
import { JsonForms } from "@jsonforms/vue";
import { boplusVueVanillaRenderers } from "@backoffice-plus/formbuilder";

import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

import {
    Command,
    createResolver,
    GetJsonFormCommand,
    JsonFormQuery,
    LogErrorCommand,
    Query,
    type RendererOption,
    SettingQuery,
} from "@miranum-ide/vscode/miranum-vscode-webview";
import { getVsCodeApi } from "./vscode";
import { minimalSchema, minimalUiSchema, personSchema, personUiSchema } from "./schemas";

let defaultSchema: JsonSchema = minimalSchema;
let defaultUiSchema: UISchemaElement = minimalUiSchema;
let defaultRenderer: JsonFormsRendererRegistryEntry[] = [];

if (import.meta.env.MODE === "development") {
    defaultSchema = personSchema;
    defaultUiSchema = personUiSchema;
    defaultRenderer = [...vuetifyRenderers];
}

const vscode = getVsCodeApi();

const jsonFormResolver = createResolver<JsonFormQuery>();

const previewSchema = ref<JsonSchema>(defaultSchema);
const previewUiSchema = ref<UISchemaElement>(defaultUiSchema);
const renderers = ref<JsonFormsRendererRegistryEntry[]>(defaultRenderer);

const previewData = ref<any>({});

const displayData = ref<any | undefined>(undefined);
const displayErrors = ref<any | undefined>(undefined);

let loading = true;
let jsonComponentTheme = ref<"light" | "dark">("light");

onBeforeMount(async () => {
    window.addEventListener("message", onReceiveMessage);

    if (document.body.className.includes("vscode-dark")) {
        jsonComponentTheme.value = "dark";
    }

    vscode.postMessage(new GetJsonFormCommand());
    const jsonFormQuery = await jsonFormResolver.wait();
    loading = false;
    updateRenderer(jsonFormQuery?.schema, jsonFormQuery?.uischema);
});

onUnmounted(() => {
    window.removeEventListener("message", onReceiveMessage);
});

async function onReceiveMessage(message: MessageEvent<Query | Command>) {
    const queryOrCommand = message.data;

    switch (true) {
        case queryOrCommand.type === "JsonFormQuery": {
            const jsonFormQuery = queryOrCommand as JsonFormQuery;

            if (loading) {
                jsonFormResolver.done(jsonFormQuery);
                return;
            }

            await debouncedUpdate(jsonFormQuery.schema, jsonFormQuery.uischema);
            break;
        }
        case queryOrCommand.type === "SettingQuery": {
            const settingQuery = queryOrCommand as SettingQuery;
            try {
                renderers.value = getRenderers(settingQuery.renderer);
            } catch (error) {
                vscode.postMessage(new LogErrorCommand((error as Error).message));
            }
            break;
        }
    }
}

function getRenderers(id?: RendererOption): JsonFormsRendererRegistryEntry[] {
    switch (id) {
        case "vuetify":
            return [...vuetifyRenderers];
        case "vanilla":
            return [...vanillaRenderers, ...boplusVueVanillaRenderers];
        default:
            throw new Error("Unknown renderer id: " + id);
    }
}

const debouncedUpdate = debounce(updateRenderer, 100);

function updateRenderer(schema?: JsonSchema, uischema?: UISchemaElement): void {
    if (schema) {
        previewSchema.value = schema;
    }
    if (uischema) {
        previewUiSchema.value = uischema;
    }
}

function onUpdate(jsonForm: any) {
    displayData.value = toRaw(jsonForm.data);
    displayErrors.value = toRaw(jsonForm.errors);
}
</script>

<template>
    <div class="flex flex-col">
        <div class="card p-4" style="min-height: 106px">
            <JsonForms
                :data="previewData"
                :renderers="renderers"
                :schema="previewSchema"
                :uischema="previewUiSchema"
                @change="onUpdate"
            />
        </div>

        <div class="grid grid-cols-2 v-container py-6 max-h-[750px] overflow-hidden">
            <div class="overflow-y-scroll hide-scrollbar">
                <vue-json-pretty :data="displayData" :theme="jsonComponentTheme" />
            </div>
            <div class="overflow-y-scroll hide-scrollbar">
                <vue-json-pretty :data="displayErrors" :theme="jsonComponentTheme" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
    display: none;
}

.hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
