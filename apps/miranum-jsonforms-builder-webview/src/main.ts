import { createApp } from "vue";
import App from "./App.vue";
import {
    provideVSCodeDesignSystem,
    vsCodeCheckbox,
    vsCodeTextArea,
} from "@vscode/webview-ui-toolkit";

import "@backoffice-plus/formbuilder/style.css";
// import "./css/vscode-theme-colors.css"; // uncomment when run in browser
import "./css/styles.css";
import "./css/vfm.css";
import "./css/form.stylea.css";
import "./css/schemaTool.css";
import "./css/dialog.css";

provideVSCodeDesignSystem().register(vsCodeCheckbox(), vsCodeTextArea());

createApp(App).mount("#app");
