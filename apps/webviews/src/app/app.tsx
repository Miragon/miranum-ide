// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from "./app.module.css";
import GenerateInput from "./components/GenerateInput";
import GenerateProjectInput from "./components/GenerateProjectInput";

export function App(props: any) {
    let component;
    const project = false;
    if(project) {
        component = <GenerateProjectInput props={props}/>
    } else {
        component = <GenerateInput props={props}/>
    }
    return (
        <>
            {component}
            <div/>
        </>
    );
}

export default App;
