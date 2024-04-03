<script lang="ts" setup>
import { onBeforeMount, onUnmounted, ref, toRaw } from "vue";
import { debounce } from "lodash";
import {
    createAjv,
    type JsonFormsRendererRegistryEntry,
    type JsonSchema,
    type UISchemaElement,
} from "@jsonforms/core";
import { vuetifyRenderers } from "@jsonforms/vue-vuetify";
import { vanillaRenderers } from "@jsonforms/vue-vanilla";
import { JsonForms } from "@jsonforms/vue";
import {
    boplusVueVanillaRenderers,
    createI18nTranslate,
} from "@backoffice-plus/formbuilder";

import {
    Command,
    LogErrorCommand,
    Query,
    Renderer,
    SchemaQuery,
    SettingQuery,
    UiSchemaQuery,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import { translationsErrors as localeCatalogue } from "./translations/de";
import { getVsCodeApi } from "./vscode";

const vscode = getVsCodeApi();

const ajv = createAjv({
    validateSchema: false,
    addUsedSchema: false,
});
const renderers = ref<JsonFormsRendererRegistryEntry[]>([]);

const minimalSchema: JsonSchema = {
    type: "object",
    properties: {},
};

const minimalUiSchema: UISchemaElement = {
    type: "VerticalLayout",
};

const previewSchema = ref<JsonSchema>(minimalSchema);
const previewUiSchema = ref<UISchemaElement>(minimalUiSchema);
const previewData = ref<JSON | undefined>(undefined);
const previewErrors = ref<string | undefined>(undefined);

onBeforeMount(async () => {
    window.addEventListener("message", onReceiveMessage);
});

onUnmounted(() => {
    window.removeEventListener("message", onReceiveMessage);
});

async function onReceiveMessage(message: MessageEvent<Query | Command>) {
    const queryOrCommand = message.data;

    switch (true) {
        case queryOrCommand.type === "SchemaQuery": {
            const schemaQuery = queryOrCommand as SchemaQuery;
            await debouncedUpdate(schemaQuery.schema);
            break;
        }
        case queryOrCommand.type === "UiSchemaQuery": {
            const uiSchemaQuery = queryOrCommand as UiSchemaQuery;
            await debouncedUpdate(undefined, uiSchemaQuery.uiSchema);
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

function getRenderers(id?: Renderer): JsonFormsRendererRegistryEntry[] {
    switch (id) {
        case Renderer.VUETIFY:
            return [...vuetifyRenderers];
        case Renderer.VANILLA:
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
    previewData.value = toRaw(jsonForm.data);
    previewErrors.value = toRaw(jsonForm.errors);
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="card p-4" style="min-height: 106px">
            <JsonForms
                :ajv="ajv"
                :data="{}"
                :i18n="{ translate: createI18nTranslate(localeCatalogue) }"
                :renderers="renderers"
                :schema="previewSchema"
                :uischema="previewUiSchema"
                @change="onUpdate"
            />
        </div>

        <div class="flex gap-4">
            <textarea
                :v-model="previewData"
                class="h-60 p-4"
                disabled
                readonly
            ></textarea>
            <textarea
                v-model="previewErrors"
                class="h-60 p-4 text-red-600"
                disabled
                readonly
            ></textarea>
        </div>
    </div>
</template>
