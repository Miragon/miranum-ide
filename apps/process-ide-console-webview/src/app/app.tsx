import GenerateInput from "./components/GenerateInput";
import GenerateProjectInput from "./components/GenerateProjectInput";
import { Container, createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import * as React from "react";
import { useState } from "react";

const theme = createTheme();

interface Props {
    vs: any;
}

export function App(props: Props) {
    const [currentPath, setCurrentPath] = useState<string>("");
    const [view, setView] = useState<string>();
    const [config, setConfig] = useState();

    // todo page goes blank if extension is in the background
    // make sure that the states are not set to undefined
    window.addEventListener('message', e => {
        const event = e.data;
        console.log(`Processed event: ${event.command} ${event.view}`);
        if (event.command === "show") {
            setConfig(event.data.processIDE);
            setCurrentPath(event.data.currentPath);
            setView(event.view);
        }
    });

    return (
        <ThemeProvider theme={theme}>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                {view === "generateFile" && <GenerateInput vs={props.vs} config={config} currentPath={currentPath}/> }
                {view === "generateProject" && <GenerateProjectInput vs={props.vs} currentPath={currentPath}/> }
            </Container>
        </ThemeProvider>
    );
}

export default App;
