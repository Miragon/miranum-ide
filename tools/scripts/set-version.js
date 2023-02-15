const fs = require("fs");
const path = require("path");

/**
 *  We follow a single version approach for typescript apps and libs.
 *  The version for these apps and libs is set in the root package.json
 *
 *  This script reads the version from the root package.json and adds it
 *  to every generated package.json in the dist folder.
 */

function setVersionInPackageJsonsRecursively(dirPath) {
    const projectVersion = JSON.parse(fs.readFileSync("./package.json", "utf-8")).version;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            // Recurse into subdirectories
            setVersionInPackageJsonsRecursively(filePath);
        } else if (file === "package.json") {
            const packageJson = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            packageJson["version"] = projectVersion;
            fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2));
        }
    }
}

setVersionInPackageJsonsRecursively("./dist");
