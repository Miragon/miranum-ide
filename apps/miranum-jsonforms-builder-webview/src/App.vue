<script lang="ts" setup>
import { onBeforeMount, onUnmounted, ref } from "vue";
import type { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { vanillaRenderers } from "@jsonforms/vue-vanilla";
import {
    boplusVueVanillaRenderers,
    defaultTools,
    FormBuilder,
    formbuilderRenderers,
} from "@backoffice-plus/formbuilder";
import { debounce } from "lodash";

import {
    Command,
    createResolver,
    GetJsonFormCommand,
    JsonFormQuery,
    Query,
    SyncDocumentCommand,
} from "@miranum-ide/vscode/miranum-vscode-webview";

import { getVsCodeApi } from "./vscode";

type JsonForms = {
    schema: JsonSchema | undefined;
    uischema: UISchemaElement | undefined;
};

const vscode = getVsCodeApi();

const debouncedUpdate = debounce(updateForm, 100);
const debouncedSendChanges = debounce(sendChanges, 100);

const jsonFormResolver = createResolver<JsonFormQuery>();

const key = ref(0);
const jsonForms = ref<JsonForms>();
const schemaReadOnly = ref(false);

const tools = [...defaultTools];
const jsonFormsRenderers = [
    ...vanillaRenderers,
    ...boplusVueVanillaRenderers,
    ...formbuilderRenderers,
];

let loading = true;

/**
 * The Main function that gets executed after the webview is fully loaded.
 * This way we can ensure that when the backend sends a message, it is caught.
 * There are two reasons why a webview gets build:
 * 1. A new .form.json file was opened
 * 2. User switched to another tab and now switched back
 */
onBeforeMount(async () => {
    window.addEventListener("message", onReceiveMessage);

    vscode.postMessage(new GetJsonFormCommand());
    const jsonFormQuery = await jsonFormResolver.wait();
    loading = false;
    updateForm(jsonFormQuery?.schema, jsonFormQuery?.uischema);
});

onUnmounted(() => {
    window.removeEventListener("message", onReceiveMessage);
});

function updateForm(schema?: JsonSchema, uischema?: UISchemaElement): void {
    if (schema) {
        jsonForms.value = {
            schema: schema,
            uischema: jsonForms.value?.uischema,
        };
    }
    if (uischema) {
        jsonForms.value = {
            schema: jsonForms.value?.schema,
            uischema: uischema,
        };
    }
    key.value++;
}

function sendChanges(data: JsonForms) {
    if (loading) {
        return;
    }
    vscode.postMessage(new SyncDocumentCommand(JSON.stringify(data)));
}

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
    }
}
</script>

<template>
    <div class="vscode container max-w-screen-lg mx-auto flex flex-col gap-4 p-4">
        <vscode-checkbox
            :checked="schemaReadOnly"
            @change="
                (event: any) => {
                    schemaReadOnly = event.target.checked;
                }
            "
        >
            Schema ReadOnly
        </vscode-checkbox>

        <FormBuilder
            :key="key"
            :json-forms="jsonForms"
            :json-forms-renderers="jsonFormsRenderers"
            :schema-read-only="schemaReadOnly"
            :tools="tools"
            @schema-updated="debouncedSendChanges"
        />
    </div>
</template>

<style>
.card {
    @apply rounded bg-white shadow;
}

.mr-5 {
    margin-right: 1.25rem;
}

.formbuilder nav {
    box-shadow: 0 8px 8px -8px rgb(30, 30, 30, 30%);
    z-index: 9;
    @apply sticky top-0 pt-2;
}
</style>
