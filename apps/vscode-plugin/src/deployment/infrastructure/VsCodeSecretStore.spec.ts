import { describe, expect, it } from "vitest";

import { InMemorySecretStorage } from "../../__fixtures__/vscodeStorage";
import { VsCodeSecretStore } from "./VsCodeSecretStore";

const SLOT = "/ws/.camunda/deployment-targets.json::dev";
const OTHER_SLOT = "/ws/.camunda/deployment-targets.json::prod";

function createStore() {
    const secrets = new InMemorySecretStorage();
    return { secrets, store: new VsCodeSecretStore(secrets) };
}

describe("VsCodeSecretStore", () => {
    it("reads the unnamed ad-hoc credentials earlier releases stored", async () => {
        const { secrets, store } = createStore();
        await secrets.store("bpmn-modeler.deployment.basicUsername", "demo");
        await secrets.store("bpmn-modeler.deployment.basicPassword", "secret");
        await secrets.store("bpmn-modeler.deployment.oauth2ClientId", "client");
        await secrets.store("bpmn-modeler.deployment.oauth2ClientSecret", "client-secret");

        await expect(store.getBasicAuth()).resolves.toEqual({
            username: "demo",
            password: "secret",
        });
        await expect(store.getOAuth2()).resolves.toEqual({
            clientId: "client",
            clientSecret: "client-secret",
        });
    });

    it("scopes a target's credentials under its slot", async () => {
        const { secrets, store } = createStore();

        await store.saveBasicAuth("demo", "secret", SLOT);
        await store.saveOAuth2("client", "client-secret", SLOT);

        expect([...secrets.entries.keys()]).toEqual([
            `bpmn-modeler.deployment.${SLOT}.basicUsername`,
            `bpmn-modeler.deployment.${SLOT}.basicPassword`,
            `bpmn-modeler.deployment.${SLOT}.oauth2ClientId`,
            `bpmn-modeler.deployment.${SLOT}.oauth2ClientSecret`,
        ]);
        await expect(store.getBasicAuth(SLOT)).resolves.toEqual({
            username: "demo",
            password: "secret",
        });
        await expect(store.getOAuth2(SLOT)).resolves.toEqual({
            clientId: "client",
            clientSecret: "client-secret",
        });
    });

    it("keeps the ad-hoc credentials and each target's slot apart", async () => {
        const { store } = createStore();

        await store.saveBasicAuth("adhoc", "a");
        await store.saveBasicAuth("dev", "d", SLOT);

        await expect(store.getBasicAuth()).resolves.toEqual({ username: "adhoc", password: "a" });
        await expect(store.getBasicAuth(SLOT)).resolves.toEqual({ username: "dev", password: "d" });
        await expect(store.getBasicAuth(OTHER_SLOT)).resolves.toBeUndefined();
    });

    it("treats a half-written credential pair as missing", async () => {
        const { secrets, store } = createStore();
        await secrets.store(`bpmn-modeler.deployment.${SLOT}.basicUsername`, "demo");
        await secrets.store(`bpmn-modeler.deployment.${SLOT}.oauth2ClientSecret`, "client-secret");

        await expect(store.getBasicAuth(SLOT)).resolves.toBeUndefined();
        await expect(store.getOAuth2(SLOT)).resolves.toBeUndefined();
    });

    it("returns an empty password rather than treating it as missing", async () => {
        const { store } = createStore();

        await store.saveBasicAuth("demo", "", SLOT);

        await expect(store.getBasicAuth(SLOT)).resolves.toEqual({ username: "demo", password: "" });
    });

    it("deletes every credential of one slot and leaves the others", async () => {
        const { store } = createStore();
        await store.saveBasicAuth("adhoc", "a");
        await store.saveBasicAuth("dev", "d", SLOT);
        await store.saveOAuth2("dev-client", "dev-secret", SLOT);
        await store.saveBasicAuth("prod", "p", OTHER_SLOT);

        await store.delete(SLOT);

        await expect(store.getBasicAuth(SLOT)).resolves.toBeUndefined();
        await expect(store.getOAuth2(SLOT)).resolves.toBeUndefined();
        await expect(store.getBasicAuth()).resolves.toEqual({ username: "adhoc", password: "a" });
        await expect(store.getBasicAuth(OTHER_SLOT)).resolves.toEqual({
            username: "prod",
            password: "p",
        });
    });
});
