import {DigiwfDeploymentPluginRest} from "./digiwf-deployment-plugin-rest";

describe("deploy", () => {
    it("should come back as false", async () => {
        const ddpr = new DigiwfDeploymentPluginRest("test", [{name:"testfail",url:"www.xD.org"}]);
        const artifact = {type: "type1",
                        project: "project1",
                        file: {name: "name", extension: "extension", content: "content", size: 1, path: "path1"}
                        };

        ddpr.deploy("hi", artifact)
            .catch(err => expect(err.message).toContain("No target configured for"))
    });
});
