<template>

  <div class="container max-w-screen-lg mx-auto p-4 flex flex-col gap-4">

    <div v-if="mode === 'modeler'">
      Disable Formbuilder: <input type="checkbox" v-model="disableFormbuilder" /><br>
      Schema ReadOnly: <input type="checkbox" v-model="schemaReadOnly" /><br>
    </div>

    <FormBuilder
        :key="key + (schemaReadOnly?1:0)"
        :jsonForms="jsonForms"
        :jsonFormsRenderers="jsonFormsRenderers"
        :schemaReadOnly="schemaReadOnly"
        :tools="tools"
        v-if="!disableFormbuilder"
        v-show="mode === 'modeler'"
        @schemaUpdated="sendChangesToExtension"
    />
    <FormBuilderDetails
        :key="(disableFormbuilder?1:0)"
        :jsonForms="jsonForms"
        v-if="mode === 'renderer'"
    />
  </div>

</template>

<script setup lang="ts">
import { defaultTools, FormBuilder } from "@backoffice-plus/formbuilder";
import FormBuilderDetails from "./FormBuilderDetails.vue";
import { onMounted, onUnmounted, ref } from "vue";
import { vanillaRenderers } from "@jsonforms/vue-vanilla";
import { boplusVueVanillaRenderers } from "@backoffice-plus/formbuilder";
import { VsCode } from "../../lib";
import { JsonForm } from "../../utils";
import { debounce } from "lodash";

// VS Code stuff
declare const vscode: VsCode
const state = vscode.getState();
const data: JsonForm = JSON.parse(state.text);
const mode = ref(state.mode);
let isUpdateFromExtension = false;

const tools = [
  ...defaultTools,
];

const jsonFormsRenderers = Object.freeze([
    ...vanillaRenderers,
    ...boplusVueVanillaRenderers,
]);

const schemaReadOnly = ref(false);
const disableFormbuilder = ref(false);
//const jsonFormsResolved = ref({});
const jsonForms = ref<JsonForm>({
  data: data.data ? data.data : JSON.parse("{}"),
  schema: data.schema,
  uischema: data.uischema,
});
const key = ref(0);

function updateForm(newData: JsonForm): void {
  vscode.setState({
    ...vscode.getState(),
    text: JSON.stringify(newData)
  });
  jsonForms.value = {
    data: newData.data ? newData.data : JSON.parse("{}"),
    schema: newData.schema,
    uischema: newData.uischema,
  }
  // todo: Is there a better way to reload the component?
  key.value++;
}

const getDataFromExtension = debounce(receiveMessage, 50);
function receiveMessage(message: MessageEvent): void {
  const msg = message.data;

  try {
    const newForm: JsonForm = JSON.parse(msg.text);

    switch (msg.type) {
      case "jsonform-modeler.updateFromExtension": {
        isUpdateFromExtension = true;
        updateForm(newForm);
        break;
      }
      case "jsonform-modeler.undo":
      case "jsonform-modeler.redo": {
        isUpdateFromExtension = true;
        updateForm(newForm);
        break;
      }
      case "jsonform-modeler.confirmation": {
        confirm(msg.text);
        break;
      }
      case "jsonform-renderer.updateFromExtension": {
        isUpdateFromExtension = true;
        updateForm(newForm);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error(`[Miranum.JsonForms.Webview] Could not process incoming message! ${error}`);
  }
}

const sendChangesToExtension = debounce(postMessage, 10);
function postMessage(jsonForm: JsonForm) {
  if (!isUpdateFromExtension) {
    jsonForm.data = jsonForms.value.data;
    const serialize = JSON.stringify(jsonForm);

    vscode.setState({
      ...vscode.getState(),
      text: serialize,
    });

    vscode.postMessage({
      type: "jsonform-modeler.updateFromWebview",
      content: serialize
    });
  }
  isUpdateFromExtension = false // reset
}

let confirm: any = null;
function confirmed() {
  // this promise resolves when confirm() is called!
  return new Promise((resolve) => {
    confirm = (response: boolean) => { resolve(response) }
  })
}

// @ts-ignore
window.confirm = async function (message: string | undefined) {
  const msg = (message) ? message : "";
  vscode.postMessage({
   type: "jsonform-modeler.confirmation",
   content: msg
  })
  return await confirmed();
}

onMounted(() => {
  window.addEventListener("message", getDataFromExtension);
})

onUnmounted(() => {
  window.removeEventListener("message", getDataFromExtension);
})

</script>


<style>
body {
  background-color: #f3f4f5;
}

.card {
  @apply
  bg-white rounded shadow
}
</style>
