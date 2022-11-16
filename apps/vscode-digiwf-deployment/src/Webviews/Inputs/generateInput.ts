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
            <h3>name:</h3>
            <textarea id="name">ProjectName</textarea>
        </div>
        <div>
            <h3>type:</h3>
            <textarea id="type">bpmn</textarea>
        </div>
        <div>
            <h3>Path:</h3>
            <textarea id="path">Users/jakobmertl/Desktop</textarea>
        </div>
        <button id="confirm">generate</button>
        <script>
            const vscode = acquireVsCodeApi();
            let name = "test Project";
            let type = "bpmn";
            let path = "Users/jakobmertl/Desktop";

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

export function getGenerateProjectWebview() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generate a Project</title>
    </head>
    <body>
        <div>
            <h3>Project name:</h3>
            <textarea id="name">ProjectName</textarea>
        </div>
        <div>
            <h3>Path:</h3>
            <textarea id="path">Users/jakobmertl/Desktop/ProjectName</textarea>
        </div>
        <button id="confirm">generate</button>
        <script>
            const vscode = acquireVsCodeApi();
            let name = "test Project";
            let path = "Users/jakobmertl/Desktop";

            confirm = document.getElementById("confirm");
            confirm.addEventListener("click", async () => {
                name = document.getElementById("name").value;
                path = document.getElementById("path").value;
                if(name && path) {
                    vscode.postMessage({
                        message:'generateProject', name: name, path: path
                    })
                }
            });

        </script>
    </body>
    </html>`;
}
