import GenerateInput from "./components/GenerateInput";
import GenerateProjectInput from "./components/GenerateProjectInput";
import { Container, createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import * as React from "react";
import {useState} from "react";

const theme = createTheme();

export function App() {
    const [view, setView] = useState<string>();
    const [name, setName] = useState<string>("");
    const [type, setType] = useState<string>("bpmn");
    const [currentPath, setCurrentPath] = useState<string>("");
    const [config, setConfig] = useState();

    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command) {
            setView(message.command);
            switch (message.command) {
                case 'generateFile':
                case 'generateProject':
                    setName(message.data.name);
                    setCurrentPath(message.data.currentPath);
                    setType(message.data.type);
                    setConfig(message.data.processIDE);
                    break;
            }
        }
    });

    return (
        <ThemeProvider theme={theme}>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
                {view === "generateFile" && <GenerateInput currentPath={currentPath} name={name} type={type} config={config!}/>}
                {view === "generateProject" && <GenerateProjectInput currentPath={currentPath} name={name}/>}
            </Container>
        </ThemeProvider>
    );
}

export default App;
