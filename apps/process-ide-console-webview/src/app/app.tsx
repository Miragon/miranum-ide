import GenerateInput from "./components/GenerateInput";
import GenerateProjectInput from "./components/GenerateProjectInput";
import { Container, createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import * as React from "react";

const theme = createTheme();

interface Props {
    vs: any;
    config: any;
    currentPath: string;
    project: boolean;
}

export function App(props: Props) {
    return (
        <>
            <ThemeProvider theme={theme}>
                <Container component="main" maxWidth="xs">
                    <CssBaseline />
                    {props.project ?
                        <GenerateProjectInput vs={props.vs} currentPath={props.currentPath}/>
                        : <GenerateInput vs={props.vs} currentPath={props.currentPath} config={props.config}/>
                    }
                </Container>
            </ThemeProvider>
        </>
    );
}

export default App;
