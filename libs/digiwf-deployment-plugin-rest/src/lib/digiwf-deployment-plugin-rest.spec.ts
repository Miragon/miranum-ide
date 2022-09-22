import {DigiwfDeploymentPluginRest} from "./digiwf-deployment-plugin-rest";

describe("deploy", () => {
    it("should come back as false", async () => {
        const ddpr = new DigiwfDeploymentPluginRest("test", [{name:"testfail",url:"www.xD.org"}]);
        const artifact = {type: "type1",
                        project: "project1",
                        path: "path1",
                        file: {name: "name", extension: "extension", content: "content", size: 1}
                        };

        const deploymentSuccess = await ddpr.deploy("hi", artifact);

        expect(deploymentSuccess.success).toBeFalsy();
        expect(deploymentSuccess.message).toEqual(`No target configured for hi`);
    });
});
