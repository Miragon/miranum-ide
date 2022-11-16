export function getGenerateFileWebview() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generate</title>
    </head>
    <body>
        <div>
            <h3>Name:</h3>
            <textarea id="name">test</textarea>
        </div>
        <div>
            <h3>Type:</h3>
            <textarea id="type">bpmn</textarea>
        </div>
        <div>
            <h3>Path:</h3>
            <textarea id="path">absolutePath</textarea>
        </div>
        <button id="confirm">generate</button>
        <script>
            const vscode = acquireVsCodeApi();
            let name = "test";
            let type = "bpmn";
            let path = "absolutePath";

            confirm = document.getElementById("confirm");
            confirm.addEventListener("click", async () => {
                name = document.getElementById("name").value;
                type = document.getElementById("type").value;
                path = document.getElementById("path").value;
                if(name && type && path) {
                    vscode.postMessage({
                        message:'generate', name: name, type: type, path: path
                    })
                }
            });

        </script>
    </body>
    </html>`;
}
