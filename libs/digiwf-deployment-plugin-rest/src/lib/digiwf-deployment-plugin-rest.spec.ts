import { digiwfDeploymentPluginRest } from "./digiwf-deployment-plugin-rest";

describe("digiwfDeploymentPluginRest", () => {
    it("should work", () => {
        expect(digiwfDeploymentPluginRest()).toEqual(
            "digiwf-deployment-plugin-rest"
        );
    });
});
