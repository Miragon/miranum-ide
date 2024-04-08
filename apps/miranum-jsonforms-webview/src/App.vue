<script lang="ts" setup>
import AppFormBuilder from "./components/AppFormBuilder.vue";
import FormBuilderDetails from "./components/FormBuilderDetails.vue";

import {
    createResolver,
    instanceOfFormBuilderData,
    StateController,
} from "./composables";
import { VsCode } from "./composables/types";
import { MockedStateController } from "./composables/MockedStateController";
import {
    FormBuilderData,
    MessageType,
    VscMessage,
} from "@miranum-ide/vscode/shared/miranum-jsonforms";
import { onBeforeMount, onUnmounted, ref } from "vue";
import { JsonSchema, Layout } from "@jsonforms/core";
import { debounce } from "lodash";

//
// Globals
//
declare const globalViewType: string;
declare const process: { env: { NODE_ENV: string } };

const resolver = createResolver();

let stateController: VsCode;
let developmentMode = ref(false);
if (process.env.NODE_ENV === "development") {
    developmentMode.value = true;
    stateController = new MockedStateController();
} else {
    stateController = new StateController();
}

let isUpdateFromExtension = false;

const jsonForms = ref<FormBuilderData>();
const jsonFormsPreview = ref<FormBuilderData>(); // only for development

const schemaReadOnly = ref(false);
const mode = ref(globalViewType);

//
// Logic
//
function updateForm(schema?: JsonSchema, uischema?: Layout): void {
    jsonForms.value = {
        schema: schema,
        uischema: uischema,
    };
    stateController.updateState({
        mode: globalViewType,
        data: { schema, uischema },
    });
}

const getDataFromExtension = debounce(receiveMessage, 50);

function receiveMessage(message: MessageEvent<VscMessage<FormBuilderData>>): void {
    try {
        isUpdateFromExtension = true;

        const type = message.data.type;
        const data = message.data.data;

        switch (type) {
            case `${globalViewType}.${MessageType.initialize}`: {
                resolver.done(data);
                break;
            }
            case `${globalViewType}.${MessageType.restore}`: {
                resolver.done(data);
                break;
            }
            case `${globalViewType}.${MessageType.confirmation}`: {
                isUpdateFromExtension = false;
                resolver.done(message.data.confirm ?? false);
                break;
            }
            case `${globalViewType}.${MessageType.undo}`:
            case `${globalViewType}.${MessageType.redo}`:
            case `${globalViewType}.${MessageType.msgFromExtension}`: {
                updateForm(data?.schema, data?.uischema);
                break;
            }
        }
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Could not handle message";
        postMessage(MessageType.error, undefined, message);
    }
}

const sendChangesToExtension = debounce(updateFile, 100);

function updateFile(data: FormBuilderData) {
    if (isUpdateFromExtension) {
        isUpdateFromExtension = false;
        return;
    }

    if (developmentMode.value) {
        jsonFormsPreview.value = {
            schema: data.schema,
            uischema: data.uischema,
        };
    }

    stateController.updateState({
        mode: globalViewType,
        data: data,
    });
    postMessage(MessageType.msgFromWebview, data);
}

function postMessage(type: MessageType, data?: FormBuilderData, message?: string): void {
    switch (type) {
        case MessageType.msgFromWebview: {
            stateController.postMessage({
                type: `${globalViewType}.${type}`,
                data,
            });
            break;
        }
        default: {
            stateController.postMessage({
                type: `${globalViewType}.${type}`,
                logger: message,
            });
            break;
        }
    }
}

onBeforeMount(async () => {
    window.addEventListener("message", getDataFromExtension);
    try {
        isUpdateFromExtension = true;
        const state = stateController.getState();
        if (state && state.data) {
            postMessage(
                MessageType.restore,
                undefined,
                "State was restored successfully.",
            );
            mode.value = state.mode;
            let schema = state.data.schema;
            let uischema = state.data.uischema;
            const newData = await resolver.wait(); // await the response form the backend
            if (newData && instanceOfFormBuilderData(newData)) {
                // we only get new data when the user made changes while the webview was destroyed
                if (newData.schema) {
                    schema = newData.schema;
                }
                if (newData.uischema) {
                    uischema = newData.uischema;
                }
            }
            updateForm(schema, uischema);
        } else {
            postMessage(
                MessageType.initialize,
                undefined,
                "Webview was loaded successfully.",
            );
            const data = await resolver.wait(); // await the response form the backend
            if (data && instanceOfFormBuilderData(data)) {
                updateForm(data.schema, data.uischema);
            }
        }
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to initialize webview.";
        postMessage(MessageType.error, undefined, message);
    }

    postMessage(MessageType.info, undefined, "Webview was initialized.");
});

onUnmounted(() => {
    window.removeEventListener("message", getDataFromExtension);
});
</script>

<template>
    <div class="vscode container mx-auto flex max-w-screen-lg flex-col gap-4 p-4">
        <div v-if="mode === 'jsonforms-builder' || mode === 'mock'">
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
            <br />
        </div>

        <AppFormBuilder
            v-if="mode === 'jsonforms-builder' || mode === 'mock'"
            :json-form="jsonForms"
            :schema-read-only="schemaReadOnly"
            @update="sendChangesToExtension"
        />

        <FormBuilderDetails
            v-if="developmentMode && (mode === 'jsonforms-renderer' || mode === 'mock')"
            :json-form="jsonFormsPreview"
        />

        <FormBuilderDetails
            v-if="!developmentMode && (mode === 'jsonforms-renderer' || mode === 'mock')"
            :json-form="jsonForms"
        />
    </div>
</template>

<style></style>
