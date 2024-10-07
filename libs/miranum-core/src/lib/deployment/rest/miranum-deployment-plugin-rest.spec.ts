import { MiranumDeploymentPluginRest } from "./miranum-deployment-plugin-rest";

describe("deploy", () => {
    it("should come back as false", async () => {
        const mdpr = new MiranumDeploymentPluginRest("test", [
            { name: "testfail", url: "www.xD.org" },
        ]);
        const artifact = {
            type: "type1",
            project: "project1",
            file: {
                name: "name",
                extension: "extension",
                content: "content",
                size: 1,
                path: "path1",
            },
        };

        mdpr.deploy("hi", artifact).catch((err) =>
            expect(err.message).toContain("No target configured for"),
        );
    });
});
