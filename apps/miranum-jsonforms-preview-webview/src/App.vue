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
import { useTheme } from "vuetify";

import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

import {
    Command,
    createResolver,
    GetJsonFormCommand,
    GetSettingCommand,
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
let defaultRenderer: JsonFormsRendererRegistryEntry[] = [...vuetifyRenderers];

if (import.meta.env.MODE === "development") {
    defaultSchema = personSchema;
    defaultUiSchema = personUiSchema;
    defaultRenderer = [...vuetifyRenderers];
}

const vscode = getVsCodeApi();

const jsonFormResolver = createResolver<JsonFormQuery>();
const settingResolver = createResolver<SettingQuery>();

const key = ref(0);
const previewSchema = ref<JsonSchema>(defaultSchema);
const previewUiSchema = ref<UISchemaElement>(defaultUiSchema);
const renderers = ref<JsonFormsRendererRegistryEntry[]>(defaultRenderer);
const rendererStyle = ref<string>("");
const previewData = ref<any>({});
const displayData = ref<any | undefined>(undefined);
const displayErrors = ref<any | undefined>(undefined);

let loading = true;
// eslint-disable-next-line react-hooks/rules-of-hooks
const theme = useTheme();
let jsonComponentTheme = ref<"light" | "dark">("light");

onBeforeMount(async () => {
    window.addEventListener("message", onReceiveMessage);

    if (document.body.className.includes("vscode-dark")) {
        jsonComponentTheme.value = "dark";
        theme.global.name.value = "dark";
    } else {
        jsonComponentTheme.value = "light";
        theme.global.name.value = "light";
    }

    vscode.postMessage(new GetJsonFormCommand());
    vscode.postMessage(new GetSettingCommand());

    const jsonFormQuery = await jsonFormResolver.wait();
    const settingQuery = await settingResolver.wait();
    loading = false;

    updateSchema(jsonFormQuery?.schema, jsonFormQuery?.uischema);
    updateRenderer(settingQuery?.renderer);
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

            debouncedUpdate(jsonFormQuery.schema, jsonFormQuery.uischema);
            break;
        }
        case queryOrCommand.type === "SettingQuery": {
            const settingQuery = queryOrCommand as SettingQuery;
            try {
                if (loading) {
                    settingResolver.done(settingQuery);
                    return;
                }

                updateRenderer(settingQuery.renderer);
            } catch (error) {
                vscode.postMessage(new LogErrorCommand((error as Error).message));
            }
            break;
        }
    }
}

const debouncedUpdate = debounce(updateSchema, 100);

function updateSchema(schema?: JsonSchema, uischema?: UISchemaElement): void {
    if (schema) {
        previewSchema.value = schema;
    }
    if (uischema) {
        previewUiSchema.value = uischema;
    }
    key.value++;
}

function updateRenderer(id?: RendererOption) {
    switch (id) {
        case "vuetify":
            renderers.value = [...vuetifyRenderers];
            rendererStyle.value = "";
            break;
        case "vanilla":
            renderers.value = [...vanillaRenderers, ...boplusVueVanillaRenderers];
            rendererStyle.value = "styleA";
            break;
        default:
            throw new Error("Unknown renderer id: " + id);
    }
    key.value++;
}

function onUpdate(jsonForm: any) {
    displayData.value = toRaw(jsonForm.data);
    displayErrors.value = toRaw(jsonForm.errors);
}
</script>

<template>
    <div class="flex flex-col">
        <div class="card p-4" style="min-height: 106px">
            <div :class="rendererStyle">
                <JsonForms
                    :key="key"
                    :data="previewData"
                    :renderers="renderers"
                    :schema="previewSchema"
                    :uischema="previewUiSchema"
                    @change="onUpdate"
                />
            </div>
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
