// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from "./app.module.css";
import GenerateInput from "./components/GenerateInput";
import GenerateProjectInput from "./components/GenerateProjectInput";

export function App() {
    let component;
    const project = false;
    if(project) {
        component = <GenerateProjectInput/>
    } else {
        component = <GenerateInput/>
    }
    return (
        <>
            {component}
            <div/>
        </>
    );
}

export default App;
