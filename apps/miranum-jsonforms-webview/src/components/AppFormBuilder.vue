<script lang="ts" setup>
import { ref, watch } from "vue";
import {
    boplusVueVanillaRenderers,
    defaultTools,
    FormBuilder,
    formbuilderRenderers,
} from "@backoffice-plus/formbuilder";
import { vanillaRenderers } from "@jsonforms/vue-vanilla";
import { FormBuilderData } from "@miranum-ide/vscode/shared/miranum-jsonforms";

interface Props {
    jsonForm: FormBuilderData | undefined;
    schemaReadOnly: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(["update"]);

const jsonForms = ref<FormBuilderData>();
const tools = [...defaultTools];
const jsonFormsRenderers = Object.freeze([
    ...vanillaRenderers,
    ...boplusVueVanillaRenderers,
    ...formbuilderRenderers,
]);
const key = ref(0);

function update(jsonForm: FormBuilderData) {
    emit("update", jsonForm);
}

watch(
    () => props.jsonForm,
    (value) => {
        jsonForms.value = value;
        key.value++;
    },
);
</script>

<template>
    <FormBuilder
        :key="key"
        :jsonForms="jsonForms"
        :jsonFormsRenderers="jsonFormsRenderers"
        :schemaReadOnly="schemaReadOnly"
        :tools="tools"
        @schemaUpdated="update"
    />
</template>

<style>
.card {
    @apply rounded bg-white shadow;
}

.formbuilder nav {
    box-shadow: 0 8px 8px -8px rgb(30, 30, 30, 30%);
    z-index: 9;
    @apply sticky top-0 pt-2;
}
</style>
