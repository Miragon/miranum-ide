import { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";

import App from "./app/app";

const root = ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement
);

const currentPath = document.getElementsByName('currentPath')[0].getAttribute("content");
const project = document.getElementsByName('project')[0].getAttribute("content");
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const vscode = acquireVsCodeApi();

root.render(
    <StrictMode>
        <App vs={vscode} currentPath={currentPath!} project={project === "true"}/>
    </StrictMode>
);
