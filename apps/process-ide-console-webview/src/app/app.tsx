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
    const [currentPath, setCurrentPath] = useState("");
    const [project, setProject] = useState(false);
    let config: any;

    window.addEventListener('message', event => {
        const message = event.data;
        setCurrentPath(message.currentPath);

        //specific arguments
        if(message.command) {
            switch (message.command) {
                case 'generateFile':
                    setProject(false);
                    config = message.processIDE;

                    props.vs.setState({
                        project: false,
                        config: message.processIDE,
                    })
                    break;
                case 'generateProject':
                    setProject(true);

                    props.vs.setState({
                        project: true,
                    })
                    break;
            }
        }

        props.vs.setState({
            ...props.vs.getState(),
            path: message.currentPath
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

    //initial view
    return (
        <ThemeProvider theme={theme}>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                {project ?
                    <GenerateProjectInput vs={props.vs} currentPath={currentPath} name={""}/>
                    : <GenerateInput vs={props.vs} currentPath={currentPath} name={""} type={"bpmn"} config={config}/>
                }
            </Container>
        </ThemeProvider>
    );
}

export default App;
