import { createApp } from "vue";
import App from "./App.vue";
import {
    provideVSCodeDesignSystem,
    vsCodeCheckbox,
    vsCodeTextArea,
} from "@vscode/webview-ui-toolkit";

// import "./css/vscode-theme-colors.css";
import "./css/vfm.css";
import "./css/styles.css";
import "./css/form.stylea.css";
import "@backoffice-plus/formbuilder/style.css";

provideVSCodeDesignSystem().register(vsCodeCheckbox(), vsCodeTextArea());

createApp(App).mount("#app");
