<template>
    <v-app>
        <v-row v-if="mode === 'jsonschema-builder'" align="center">
            <v-text-field
                :rules="rules"
                :value="formKey"
                class="input"
                dense
                hide-details="auto"
                label="Form Key"
                outlined
                rounded
                @input="keyChanged"
            >
            </v-text-field>
            <v-select
                v-model="xDisplay"
                :items="xDisplayOptions"
                class="input"
                dense
                hide-details="auto"
                item-text="name"
                item-value="value"
                label="Display"
                outlined
                rounded
                @input="xDisplayChanged"
            >
            </v-select>
        </v-row>
        <DwfFormBuilder
            v-if="mode === 'jsonschema-builder'"
            :builder-settings="builderSettings"
            :value="schema"
            @input="schemaChanged"
        >
        </DwfFormBuilder>
        <div
            v-if="mode === 'jsonschema-renderer'"
            style="background-color: white; padding: 10px"
        >
            <DwfFormRenderer
                :key="componentKey"
                :options="{}"
                :schema="schema"
                :value="{}"
            ></DwfFormRenderer>
        </div>
    </v-app>
</template>

<script lang="ts">
import { defineComponent, onBeforeMount, onUnmounted, ref } from "vue";
import { DwfFormRenderer, Form } from "@muenchen/digiwf-form-renderer";
import { DwfFormBuilder } from "@muenchen/digiwf-form-builder";
import { SettingsEN } from "@muenchen/digiwf-form-builder-settings";
import { debounce } from "lodash";
import { MessageType, VscMessage } from "@miranum-ide/vscode/miranum-vscode-webview";
import { FormBuilderData } from "@miranum-ide/vscode/shared/miranum-forms";
import {
    initialize,
    initialized,
    instanceOfFormBuilderData,
    StateController,
} from "./composables";

declare const globalViewType: string;

export default defineComponent({
    name: "App",
    components: {
        DwfFormRenderer,
        DwfFormBuilder,
    },
    setup() {
        const stateController = new StateController();
        let isUpdateFromExtension = false;

        const formKey = ref<string>();
        const xDisplay = ref<string>();
        const xDisplayOptions = [
            { name: "Single Page", value: "" },
            { name: "Expansion Panels", value: "expansion-panels" },
            { name: "Tabs", value: "tabs" },
            { name: "Stepper", value: "stepper" },
        ];
        const schema = ref<Form>({
            key: "MyStartForm",
            type: "object",
            "x-display": "stepper",
            allOf: [],
        });
        const builderSettings = SettingsEN;

        const mode = ref(globalViewType);
        const componentKey = ref(0);

        function updateForm(newSchema?: FormBuilderData): void {
            if (newSchema !== undefined) {
                formKey.value = newSchema.key;
                schema.value = newSchema.schema;
                xDisplay.value = newSchema.schema["x-display"];
                stateController.updateState({
                    mode: globalViewType,
                    data: newSchema,
                });
            }
        }

        const getDataFromExtension = debounce(receiveMessage, 50);

        function receiveMessage(
            message: MessageEvent<VscMessage<FormBuilderData>>,
        ): void {
            try {
                isUpdateFromExtension = true;

                const type = message.data.type;
                const data = message.data.data;

                switch (type) {
                    case `jsonschema-builder.${MessageType.INITIALIZE}`: {
                        initialize(data);
                        break;
                    }
                    case `jsonschema-builder.${MessageType.RESTORE}`: {
                        initialize(data);
                        break;
                    }
                    case `jsonschema-builder.${MessageType.UNDO}`:
                    case `jsonschema-builder.${MessageType.REDO}`:
                    case `jsonschema-builder.${MessageType.MSGFROMEXTENSION}`: {
                        updateForm(data);
                        break;
                    }
                    case `jsonschema-renderer.${MessageType.INITIALIZE}`: {
                        initialize(data);
                        break;
                    }
                    case `jsonschema-renderer.${MessageType.RESTORE}`: {
                        initialize(data);
                        break;
                    }
                    case `jsonschema-renderer.${MessageType.MSGFROMEXTENSION}`: {
                        componentKey.value += 1; // renders the renderer again :)
                        updateForm(data);
                        break;
                    }
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : `${error}`;
                postMessage(MessageType.ERROR, undefined, message);
            }
        }

        const sendChangesToExtension = debounce(updateFile, 100);

        function updateFile(data: FormBuilderData) {
            if (isUpdateFromExtension) {
                isUpdateFromExtension = false;
                return;
            }
            stateController.updateState({
                mode: globalViewType,
                data,
            });
            postMessage(MessageType.MSGFROMWEBVIEW, data);
        }

        function schemaChanged(update: Form): void {
            isUpdateFromExtension = false;
            sendChangesToExtension({ key: formKey.value!, schema: update });
        }

        function keyChanged(update: string): void {
            isUpdateFromExtension = false;
            sendChangesToExtension({ key: update, schema: schema.value! });
        }

        function xDisplayChanged(update: string): void {
            isUpdateFromExtension = false;
            schema.value["x-display"] = update;
            sendChangesToExtension({
                schema: {
                    key: schema.value!.key,
                    type: schema.value!.type,
                    "x-display": update,
                    allOf: schema.value!.allOf,
                },
                key: formKey.value!,
            });
        }

        function postMessage(
            type: MessageType,
            data?: FormBuilderData,
            message?: string,
        ): void {
            switch (type) {
                case MessageType.MSGFROMWEBVIEW: {
                    stateController.postMessage({
                        type: `${globalViewType}.${type}`,
                        data: JSON.parse(JSON.stringify(data)),
                    });
                    break;
                }
                default: {
                    stateController.postMessage({
                        type: `${globalViewType}.${type}`,
                        message,
                    });
                    break;
                }
            }
        }

        onBeforeMount(async () => {
            window.addEventListener("message", getDataFromExtension);
            try {
                const state = stateController.getState();
                if (state && state.data) {
                    postMessage(
                        MessageType.RESTORE,
                        undefined,
                        "State was restored successfully.",
                    );
                    mode.value = state.mode;
                    let data = state.data;
                    const newData = await initialized(); // await the response form the backend
                    if (newData && instanceOfFormBuilderData(newData)) {
                        // we only get new data when the user made changes while the webview was destroyed
                        if (newData.schema) {
                            data = newData;
                        }
                    }
                    updateForm(data);
                } else {
                    postMessage(
                        MessageType.INITIALIZE,
                        undefined,
                        "Webview was loaded successfully.",
                    );
                    const data = await initialized(); // await the response form the backend
                    if (data && instanceOfFormBuilderData(data)) {
                        updateForm(data);
                    }
                }
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to initialize webview.";
                postMessage(MessageType.ERROR, undefined, message);
            }

            postMessage(MessageType.INFO, undefined, "Webview was initialized.");
        });

        onUnmounted(() => {
            window.removeEventListener("message", getDataFromExtension);
        });

        // Vuetify
        const rules = [
            (value: string) => !!value || "Required.",
            (value: string) =>
                /^[a-zA-Z0-9_.-]+$/.test(value) || "Allowed characters [a-zA-Z0-9_.-]",
        ];

        return {
            formKey,
            xDisplay,
            xDisplayOptions,
            schema,
            builderSettings,
            mode,
            componentKey,
            rules,
            schemaChanged,
            keyChanged,
            xDisplayChanged,
        };
    },
});
</script>

<style>
.input.theme--light.v-input {
    width: 48% !important;
    flex: 0 0 auto !important;
    padding-top: 40px !important;
    padding-left: 20px !important;
}

.input.theme--light.v-input > .v-input__control > .v-input__slot {
    flex-direction: row !important;
    flex-wrap: nowrap !important;
}
</style>
