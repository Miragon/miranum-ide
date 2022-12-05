import { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";

import App from "./app/app";

const root = ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement
);


let currentPath: string;
let project: boolean;
let config: any;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const vscode = acquireVsCodeApi();

window.addEventListener('message', event => {
    const message = event.data;
    currentPath = message.currentPath;

    //specific arguments
    switch (message.command) {
        case 'generateFile':
            project = false;
            config = message.processIDE;
            break;
        case 'generateProject':
            project = true;
            break;
    }

    //can onyl be viewed once, because this is part of the EventListener
    root.render(
        <StrictMode>
            <App currentPath={currentPath} project={project} vs={vscode} config={config}/>
        </StrictMode>
    );
});
