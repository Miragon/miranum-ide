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
            <textarea id="name">testProject</textarea>
        </div>
        <div>
            <h3>Path:</h3>
            <textarea id="path">Users/jakobmertl/Desktop</textarea>
        </div>
        <button id="confirm">generate</button>
        <script>
            const vscode = acquireVsCodeApi();
            let name = "testProject";
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
