
export function getGenerateFileWebview(scriptUrl: string) {


    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generate</title>
        <link href="${scriptUrl}/styles.css">
    </head>
    <body>
        <div id="root"></div>
        <script src="${scriptUrl}/main.js"></script>
        <script src="${scriptUrl}/vendor.js"></script>
        <script src="${scriptUrl}/styles.js"></script>
        <script src="${scriptUrl}/polyfills.js"></script>
        <script src="${scriptUrl}/runtime.js"></script>
    </body>
    </html>`;
}
