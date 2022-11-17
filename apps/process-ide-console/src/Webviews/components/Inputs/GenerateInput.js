import React, {useState} from 'react';
import * as vscode from "vscode";
import DropdownSelection from "../Dropdown/DropdownSelection";

const GenerateInput = () => {

    const [name, setName] = useState( "test");
    const [type, setType] = useState( "bpmn");
    const [path, setPath] = useState( "Users/jakobmertl/Desktop");

    const clickHandler = () => {
        setName(() => {
            return document.getElementById("name").value;
        });
        setType(() => {
            return document.getElementById("type").value;
        });
        setPath(() => {
            return document.getElementById("path").value;
        });
        if(name && type && path) {
            vscode.postMessage({
                message:'generate', name: name, type: type, path: path
            });
        }
    };

    return (
        <div>
            <section id="input-name">
                <h3>name:</h3>
                <textarea id="name">test</textarea>
            </section>
            <section id="input-name">
                <h3>type:</h3>
                <DropdownSelection id="type"/>
            </section>
            <section id="input-path">
                <h3>Path:</h3>
                <textarea id="path">Users/jakobmertl/Desktop</textarea>
            </section>
            <button onClick={this.clickHandler}>generate</button>
        </div>
    );
};

export default GenerateInput;
