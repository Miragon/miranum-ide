// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from "./app.module.css";
import GenerateInput from "./components/GenerateInput";
import GenerateProjectInput from "./components/GenerateProjectInput";

interface Props {
    vs: any;
    currentPath: string;
    project: boolean;
}

export function App(props: Props) {
    return (
        <>
            {props.project ?
                <GenerateProjectInput vs={props.vs} currentPath={props.currentPath}/>
                : <GenerateInput vs={props.vs} currentPath={props.currentPath}/>
            }
            <div/>
        </>
    );
}

export default App;
