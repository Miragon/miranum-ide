<script lang="ts" setup>
import { getCurrentInstance, onBeforeMount, ref } from "vue";
import { JsonForms } from "@jsonforms/vue2";
import { vuetifyRenderers } from "@jsonforms/vue2-vuetify";
import { JsonSchema, UISchemaElement } from "@jsonforms/core";

import {
    ConfigEditorData,
    MessageType,
    VscMessage,
} from "@miranum-ide/vscode/shared/miranum-config-editor";

import { MissingStateError, VsCode, VsCodeImpl, VsCodeMock } from "./composables/vscode";
import { createResolver } from "./composables/utils";

//
// Declare variables
//
declare const process: { env: { NODE_ENV: string } };

const renderers = ref([...vuetifyRenderers]);

const schema = ref<JsonSchema>(JSON.parse("{}"));
const uischema = ref<UISchemaElement>({
    type: "VerticalLayout",
});
const formData = ref<JSON>(JSON.parse("{}"));

let vscode: VsCode;
if (process.env.NODE_ENV === "development") {
    vscode = new VsCodeMock();
    console.log("Running in development mode.");
} else {
    vscode = new VsCodeImpl();
    console.log("Running in production mode.");
}

const resolver = createResolver<ConfigEditorData>();

//
// Declare functions
//
function onChange(event: any) {
    if (JSON.stringify(event.data) === "{}") {
        return;
    }

    try {
        vscode.updateState({ data: event.data });
        vscode.postMessage({
            type: MessageType.syncDocument,
            payload: { data: JSON.stringify(event.data) },
        });
    } catch (error) {
        console.error(error);
    }
}

function receiveMessage(message: MessageEvent<VscMessage<ConfigEditorData>>) {
    const type = message.data.type;
    const payload = message.data.payload;

    switch (type) {
        case MessageType.initialize: {
            resolver.done(payload);
            break;
        }
        case MessageType.restore: {
            resolver.done(payload);
            break;
        }
        case MessageType.syncWebview: {
            if (payload?.data) {
                const receivedData = JSON.parse(payload.data);
                formData.value = receivedData;
                vscode.updateState({ data: receivedData });
            }
            break;
        }
        case MessageType.watcher: {
            if (payload?.schema) {
                const receivedSchema = JSON.parse(payload.schema);
                schema.value = receivedSchema;
                vscode.updateState({ schema: receivedSchema });
            }
            if (payload?.uischema) {
                const receivedUiSchema = JSON.parse(payload.uischema);
                uischema.value = receivedUiSchema;
                vscode.updateState({ uischema: receivedUiSchema });
            }
        }
    }
}

onBeforeMount(async () => {
    window.addEventListener("message", receiveMessage);

    if (document.body.className === "vscode-dark") {
        const vuetify = getCurrentInstance()?.proxy["$vuetify"];
        if (vuetify) {
            vuetify.theme.dark = true;
        }
    }

    try {
        const state = vscode.getState();
        vscode.postMessage({
            type: MessageType.restore,
            payload: undefined,
            logger: "State was restored successfully.",
        });

        // We will only get data if the user made changes while the webview was in the background.
        const payload = await resolver.wait();

        console.log("restore", payload);
        schema.value = payload?.schema ? JSON.parse(payload.schema) : state.schema;
        uischema.value = payload?.uischema
            ? JSON.parse(payload.uischema)
            : state.uischema;
        formData.value = payload?.data ? JSON.parse(payload.data) : state.data;
    } catch (error) {
        if (error instanceof MissingStateError) {
            vscode.postMessage({
                type: MessageType.initialize,
                payload: undefined,
                logger: "Webview was loaded successfully.",
            });

            const payload = await resolver.wait();

            if (payload) {
                schema.value = JSON.parse(payload.schema ?? "{}");
                uischema.value = JSON.parse(payload.uischema ?? "{}");
                formData.value = JSON.parse(payload.data ?? "{}");

                vscode.setState({
                    schema: schema.value,
                    uischema: uischema.value,
                    data: formData.value,
                });
            }

            vscode.postMessage({
                type: MessageType.info,
                payload: undefined,
                logger: "Webview was initialized.",
            });
        } else {
            const message = error instanceof Error ? error.message : `${error}`;
            vscode.postMessage({
                type: MessageType.error,
                payload: undefined,
                logger: message,
            });
        }
    }
});
</script>

<template>
    <v-app>
        <v-container class="form" fluid>
            <v-card>
                <json-forms
                    :data="formData"
                    :renderers="renderers"
                    :schema="schema"
                    :uischema="uischema"
                    @change="onChange"
                />
            </v-card>
        </v-container>
    </v-app>
</template>

<style scoped>
.form {
    max-width: 900px;
}
</style>
