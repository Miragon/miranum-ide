<template>
    <v-app>
        <v-row v-if="mode === 'builder'" align="center" >
            <v-text-field
                label="Form Key"
                class="input"
                :value="formKey"
                @input="keyChanged"
                :rules="rules"
                outlined rounded dense hide-details="auto">
            </v-text-field>
            <v-select
                label="x-display"
                class="input"
                v-model="xDisplay"
                :items="xDisplayOptions"
                item-text="name"
                item-value="value"
                @input="xDisplayChanged"
                outlined rounded dense hide-details="auto">
            </v-select>
        </v-row>
        <DwfFormBuilder
            :builder-settings="builderSettings"
            :value="schema"
            @input="schemaChanged"
            v-if="mode === 'builder'">
        </DwfFormBuilder>
        <div style="background-color: white; padding: 10px" v-if="mode === 'renderer'">
            <DwfFormRenderer :options="{}" :value="{}" :schema="schema" :key="componentKey"></DwfFormRenderer>
        </div>
    </v-app>
</template>

<script lang="ts">
import {defineComponent, onMounted, onUnmounted, ref} from 'vue';
import {VsCode} from "./types/VsCode";
import {Schema} from "./types/Schema";
import {DwfFormRenderer, Form} from "@muenchen/digiwf-form-renderer";
import {DwfFormBuilder} from "@muenchen/digiwf-form-builder";
import {SettingsEN} from "@muenchen/digiwf-form-builder-settings";
import {debounce} from "lodash";

declare const vscode: VsCode;

export default defineComponent({
    name: 'App',
    components: {
        DwfFormRenderer,
        DwfFormBuilder
    },
    setup() {
        const formKey = ref<string>();
        const xDisplay = ref<string>();
        const xDisplayOptions = [
            { name:"Single Page", value:"" },
            { name:"Expansion Panels", value:"expansion-panels" },
            { name:"Tabs", value:"tabs" },
            { name:"Stepper", value:"stepper" }
        ];
        const schema = ref<Form>();
        const builderSettings = SettingsEN;

        const mode = ref('');
        const componentKey = ref(0);

        const receiveMessage = debounce(getDataFromExtension, 50);
        function getDataFromExtension(event: MessageEvent): void {
            const message = event.data;
            const newForm: Schema = JSON.parse(message.text);

            switch (message.type) {
                case 'jsonschema-renderer.updateFromExtension': {
                    componentKey.value += 1;  // renders the component again
                    updateForm(newForm);
                    break;
                }
                case 'jsonschema-builder.updateFromExtension': {
                    updateForm(newForm);
                    break;
                }
                case 'jsonschema-builder.undo':
                case 'jsonschema-builder.redo': {
                    updateForm(newForm);
                    break;
                }
                default:
                    break;
            }
        }

        function sendDataToExtension(form: Schema): void {
            const serialized = JSON.stringify(form);

            vscode.setState({
                text: serialized,
                mode: mode.value
            });
            vscode.postMessage({
                type: 'jsonschema-builder.updateFromWebview',
                content: serialized
            });
        }

        function updateForm(newForm: Schema): void {
            vscode.setState({
                text: JSON.stringify(newForm),
                mode: mode.value
            });

            formKey.value = newForm.key;
            xDisplay.value = newForm.schema["x-display"];
            schema.value = newForm.schema;
        }

        function schemaChanged(update: Form): void {
            sendDataToExtension({key: formKey.value!, schema: update});
        }

        function keyChanged(update: string): void {
            sendDataToExtension({key: update, schema: schema.value!});
        }

        function xDisplayChanged(update: string): void {
            sendDataToExtension({
                schema: {
                    key: schema.value!.key,
                    type: schema.value!.type,
                    "x-display": update,
                    allOf: schema.value!.allOf,
                },
                key: formKey.value!
            });
        }

        function escape(value: string): string {
            return value
                .replace(/[\\]/g, '\\\\')
                .replace(/[\b]/g, '\\b')
                .replace(/[\f]/g, '\\f')
                .replace(/[\n]/g, '\\n')
                .replace(/[\r]/g, '\\r')
                .replace(/[\t]/g, '\\t')
                .replace(/\\'/g, "\\'");
        }

        onMounted(() => {
            const state = vscode.getState();
            if (state) {
                const form: Schema = JSON.parse(escape(state.text));
                formKey.value = form.key;
                xDisplay.value = form.schema["x-display"];
                schema.value = form.schema;
                mode.value = state.mode;
            }

            window.addEventListener('message', receiveMessage);
        })

        onUnmounted(() => {
            window.removeEventListener('message', receiveMessage);
        })

        // Vuetify
        const rules = [
            (value: string) => !!value || 'Required.',
            (value: string) => /^[a-zA-Z0-9_.-]+$/.test(value) || 'Allowed characters [a-zA-Z0-9_.-]'
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
            xDisplayChanged
        }
    }
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
