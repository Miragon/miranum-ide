import { StrictMode } from "react";
import * as ReactDOM from "react-dom/client";

import App from "./app/app";

const root = ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement
);
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const props = document.currentScript.getAttribute("props");
console.log(props);

root.render(
    <StrictMode>
        <App props={props}/>
    </StrictMode>
);
