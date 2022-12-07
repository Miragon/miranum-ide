import GenerateInput from "./components/GenerateInput";
import GenerateProjectInput from "./components/GenerateProjectInput";
import { Container, createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import * as React from "react";
import {useState} from "react";

const theme = createTheme();

interface Props {
    vs: any;
}

export function App(props: Props) {
    const [currentPath, setCurrentPath] = useState<string>("");
    const [view, setView] = useState<string>();
    const [config, setConfig] = useState();

    window.addEventListener('message', event => {
        const message = event.data;
        setCurrentPath(message.currentPath);

        //specific arguments
        if(message.command) {
            setView(message.command);
            switch (message.command) {
                case 'generateFile':
                    setConfig(message.data.processIDE);

                    props.vs.setState({
                        project: false,
                        config: message.data.processIDE,
                    })
                    break;
                case 'generateProject':
                    props.vs.setState({
                        project: true,
                    })
                    break;
            }
        }

        props.vs.setState({
            ...props.vs.getState(),
            path: message.data.currentPath
        });
    });

    const state = props.vs.getState()
    if(state){
        return (
            <ThemeProvider theme={theme}>
                <Container component="main" maxWidth="xs">
                    <CssBaseline />
                    {state.project ?
                        <GenerateProjectInput vs={props.vs} currentPath={state.path} name={state.name? state.name : ""}/>
                        : <GenerateInput vs={props.vs} currentPath={state.path} name={state.name? state.name : ""} type={state.type? state.type : "bpmn"} config={state.config}/>
                    }
                </Container>
            </ThemeProvider>
        );
    }
    /**
     *                     {view === "generateFile" && <GenerateInput vs={props.vs} currentPath={state.path} name={state.name? state.name : ""} type={state.type? state.type : "bpmn"} config={state.config}/>}
     *                     {view === "generateProject" && <GenerateProjectInput vs={props.vs} currentPath={state.path} name={state.name? state.name : ""}/>}
     */

    //initial view
    return (
        <ThemeProvider theme={theme}>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                {view === "generateFile" && <GenerateInput vs={props.vs} currentPath={currentPath} name={""} type={"bpmn"} config={config}/>}
                {view === "generateProject" && <GenerateProjectInput vs={props.vs} currentPath={currentPath} name={""}/>}
            </Container>
        </ThemeProvider>
    );
}

export default App;
