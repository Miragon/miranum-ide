<script lang="ts" setup>
import { ref } from "vue";
import { JsonForms } from "@jsonforms/vue2";
import { vuetifyRenderers } from "@jsonforms/vue2-vuetify";

import jsonSchema from "./assets/schema.json";
import jsonUiSchema from "./assets/uischema.json";
import jsonData from "./assets/data.json";

const renderers = ref([...vuetifyRenderers]);

const schema = ref(jsonSchema);
const uischema = ref(jsonUiSchema);
const data = ref(jsonData);

function onChange(event: any) {
    console.log("onChange()", event.data);
}
</script>

<template>
    <json-forms
        :data="data"
        :renderers="renderers"
        :schema="schema"
        :uischema="uischema"
        @change="onChange"
    />
</template>

<style scoped></style>
