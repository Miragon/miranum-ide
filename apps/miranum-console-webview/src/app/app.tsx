import { MiranumConfig } from "@miranum-ide/miranum-core";
import { VscMessage } from "@miranum-ide/vscode/miranum-vscode-webview";
import { ConsoleData } from "@miranum-ide/vscode/shared/miranum-console";
import GenerateInput from "./components/GenerateInput";
import GenerateProjectInput from "./components/GenerateProjectInput";
import { Container, createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import * as React from "react";
import { useState } from "react";

const theme = createTheme();
type CustomMessageEvent = MessageEvent<VscMessage<ConsoleData>>;

export function App() {
    const [view, setView] = useState<string>();
    const [name, setName] = useState<string>("");
    const [type, setType] = useState<string>("bpmn");
    const [currentPath, setCurrentPath] = useState<string>("");
    const [config, setConfig] = useState<MiranumConfig>();

    window.addEventListener("message", (event: CustomMessageEvent) => {
        const message = event.data;
        if (message.data) {
            const data = message.data;
            setView(data.command);
            switch (data.command) {
                case "generateFile":
                case "generateProject":
                    if (data.fileData.name) setName(data.fileData.name);
                    if (data.fileData.path) setCurrentPath(data.fileData.path);
                    if (data.fileData.type) setType(data.fileData.type);
                    if (data.miranumJson) setConfig(data.miranumJson);
                    break;
            }
        }
    });

    return (
        <ThemeProvider theme={theme}>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                {view === "generateFile" && (
                    <GenerateInput
                        currentPath={currentPath}
                        name={name}
                        type={type}
                        config={config}
                    />
                )}
                {view === "generateProject" && (
                    <GenerateProjectInput currentPath={currentPath} name={name} />
                )}
            </Container>
        </ThemeProvider>
    );
}

export default App;
