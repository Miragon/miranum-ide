import { describe, expect, it } from "vitest";

import {
    DisallowedEnvReferenceError,
    InvalidDeploymentConfigError,
    UnresolvedEnvVariableError,
} from "../../shared/domain/errors";

import { BasicAuth, DeploymentConfigBuilder, NoAuth, OAuth2Auth } from "./deployment";

function completeBuilder(): DeploymentConfigBuilder {
    return new DeploymentConfigBuilder()
        .withDeploymentName("my-process")
        .withEndpoint("https://camunda.example/engine-rest")
        .withMainFilePath("/abs/main.bpmn");
}

function errorFrom(action: () => unknown): unknown {
    try {
        action();
    } catch (error) {
        return error;
    }
    throw new Error("expected the action to throw");
}

describe("NoAuth", () => {
    describe("toHeaders", () => {
        it("should return an empty header set", () => {
            expect(new NoAuth().toHeaders()).toEqual({});
        });
    });
});

describe("BasicAuth", () => {
    describe("toHeaders", () => {
        it("should return a Base64-encoded Authorization header", () => {
            const expected = Buffer.from("admin:secret").toString("base64");

            expect(new BasicAuth("admin", "secret").toHeaders()).toEqual({
                Authorization: `Basic ${expected}`,
            });
        });

        // Guards the RFC 7617 UTF-8 contract — Latin-1 (e.g. btoa) would
        // produce a different base64 string and break interoperability.
        it("should UTF-8-encode non-ASCII credentials before base64", () => {
            const expected = Buffer.from("user:name:p@ss:wörd").toString("base64");

            expect(new BasicAuth("user:name", "p@ss:wörd").toHeaders()).toEqual({
                Authorization: `Basic ${expected}`,
            });
        });
    });
});

describe("DeploymentConfigBuilder", () => {
    describe("build", () => {
        it("passes every field through and defaults auth to NoAuth", () => {
            const auth = new BasicAuth("admin", "secret");

            const config = completeBuilder()
                .withTenantId("tenant-1")
                .withEngine("c8")
                .withAdditionalFilePaths(["/abs/form.form"])
                .withAuth(auth)
                .build();

            expect(config).toMatchObject({
                deploymentName: "my-process",
                tenantId: "tenant-1",
                endpoint: "https://camunda.example/engine-rest",
                engine: "c8",
                mainFilePath: "/abs/main.bpmn",
                additionalFilePaths: ["/abs/form.form"],
                auth,
            });
        });

        it("defaults auth to NoAuth when left unset", () => {
            expect(completeBuilder().build().auth).toBeInstanceOf(NoAuth);
        });

        it("carries a deployUrl override and normalises blank values to undefined", () => {
            expect(completeBuilder().withDeployUrl("https://gw/deploy").build().deployUrl).toBe(
                "https://gw/deploy",
            );
            expect(completeBuilder().withDeployUrl("   ").build().deployUrl).toBeUndefined();
            expect(completeBuilder().build().deployUrl).toBeUndefined();
        });

        it.each([
            ["deploymentName", (b: DeploymentConfigBuilder) => b.withDeploymentName("")],
            ["endpoint", (b: DeploymentConfigBuilder) => b.withEndpoint("")],
            ["mainFilePath", (b: DeploymentConfigBuilder) => b.withMainFilePath("")],
        ])("throws listing %s when it is missing", (field, clear) => {
            expect(() => clear(completeBuilder()).build()).toThrow(
                new InvalidDeploymentConfigError([field]),
            );
        });

        // Whitespace-only values are functionally empty: build() trims before
        // the emptiness check (deployment.ts:186), so they must be rejected too.
        it("treats whitespace-only required fields as missing", () => {
            expect(() => completeBuilder().withDeploymentName("   ").build()).toThrow(
                new InvalidDeploymentConfigError(["deploymentName"]),
            );
        });

        it("lists all missing fields together in declared order", () => {
            expect(() => new DeploymentConfigBuilder().build()).toThrow(
                new InvalidDeploymentConfigError(["deploymentName", "endpoint", "mainFilePath"]),
            );
        });
    });
});

describe("env references", () => {
    const lookup = (map: Record<string, string>) => (name: string) => map[name];

    describe("referencesEnv", () => {
        it("is false for NoAuth", () => {
            expect(new NoAuth().referencesEnv()).toBe(false);
        });

        it.each([
            ["username", new BasicAuth("${env:MIRAGON_USER}", "secret")],
            ["password", new BasicAuth("admin", "${env:MIRAGON_PASSWORD}")],
        ])("is true when the basic %s holds a ref", (_field, auth) => {
            expect(auth.referencesEnv()).toBe(true);
        });

        it.each([
            ["clientId", new OAuth2Auth("${env:MIRAGON_CID}", "s", "https://idp/token", "aud")],
            ["clientSecret", new OAuth2Auth("cid", "${env:MIRAGON_S}", "https://idp/token", "aud")],
            ["tokenEndpoint", new OAuth2Auth("cid", "s", "${env:MIRAGON_IDP}/token", "aud")],
            ["audience", new OAuth2Auth("cid", "s", "https://idp/token", "${env:MIRAGON_AUD}")],
        ])("is true when the oauth2 %s holds a ref", (_field, auth) => {
            expect(auth.referencesEnv()).toBe(true);
        });

        it("is false for literal credentials", () => {
            expect(new BasicAuth("admin", "secret").referencesEnv()).toBe(false);
            expect(new OAuth2Auth("cid", "s", "https://idp/token", "aud").referencesEnv()).toBe(
                false,
            );
        });

        it.each([
            ["endpoint", completeBuilder().withEndpoint("${env:MIRAGON_URL}")],
            ["tenantId", completeBuilder().withTenantId("${env:MIRAGON_TENANT}")],
            ["deployUrl", completeBuilder().withDeployUrl("${env:MIRAGON_URL}/deploy")],
            ["auth", completeBuilder().withAuth(new BasicAuth("admin", "${env:MIRAGON_PW}"))],
        ])("is true when the config's %s holds a ref", (_field, builder) => {
            expect(builder.build().referencesEnv()).toBe(true);
        });

        it("is false for a fully literal config", () => {
            const config = completeBuilder()
                .withTenantId("acme")
                .withDeployUrl("https://gw/deploy")
                .withAuth(new BasicAuth("admin", "secret"))
                .build();

            expect(config.referencesEnv()).toBe(false);
        });

        it("counts a malformed ref so it reaches validation", () => {
            expect(completeBuilder().withEndpoint("${env:").build().referencesEnv()).toBe(true);
        });
    });

    describe("assertCredentialEnvRefsValid", () => {
        it("passes literals and prefixed refs", () => {
            expect(() => new NoAuth().assertCredentialEnvRefsValid()).not.toThrow();
            expect(() =>
                new BasicAuth("${env:MIRAGON_USER}", "literal").assertCredentialEnvRefsValid(),
            ).not.toThrow();
            expect(() =>
                new OAuth2Auth(
                    "${env:MIRAGON_CID}",
                    "secret",
                    "https://${env:MIRAGON_IDP}/token",
                    "aud",
                ).assertCredentialEnvRefsValid(),
            ).not.toThrow();
        });

        it.each([
            ["auth.username", new BasicAuth("${env:GITHUB_TOKEN}", "secret")],
            ["auth.password", new BasicAuth("admin", "${env:MIRAGON_PW")],
            ["auth.clientId", new OAuth2Auth("${env:CID}", "s", "https://idp/token", "aud")],
            ["auth.clientSecret", new OAuth2Auth("cid", "${env:}", "https://idp/token", "aud")],
        ])("names the JSON field %s of a disallowed ref", (field, auth) => {
            const error = errorFrom(() => auth.assertCredentialEnvRefsValid());

            expect(error).toBeInstanceOf(DisallowedEnvReferenceError);
            expect(error).toMatchObject({ field });
        });

        it("leaves the oauth2 token endpoint and audience to the target's validation", () => {
            const auth = new OAuth2Auth("cid", "s", "${env:HOME}/token", "${env:MIRAGON_}");

            expect(() => auth.assertCredentialEnvRefsValid()).not.toThrow();
        });
    });

    describe.each([
        ["an unclosed ref", "p${env:hunter2rest"],
        ["a ref name with a space", "${env:hunter 2}"],
        ["a well-formed foreign ref", "p${env:hunter2}rest"],
    ])("a credential holding %s", (_desc, secret) => {
        function thrownMessage(action: () => unknown): string {
            const error = errorFrom(action);
            expect(error).toBeInstanceOf(DisallowedEnvReferenceError);
            return (error as Error).message;
        }

        it.each([
            ["auth.password", new BasicAuth("admin", secret)],
            ["auth.clientSecret", new OAuth2Auth("cid", secret, "https://idp", "aud")],
        ])("is never echoed from %s on validation or expansion", (field, auth) => {
            const messages = [
                thrownMessage(() => auth.assertCredentialEnvRefsValid()),
                thrownMessage(() => auth.expandEnvRefs(lookup({}))),
            ];

            for (const message of messages) {
                expect(message).toContain(`"${field}" contains an invalid environment reference`);
                expect(message).not.toContain("hunter");
            }
        });
    });

    describe("expandEnvRefs", () => {
        it("expands every oauth2 field", () => {
            const resolved = new OAuth2Auth(
                "${env:MIRAGON_CID}",
                "${env:MIRAGON_SECRET}",
                "${env:MIRAGON_IDP}/token",
                "${env:MIRAGON_AUD}",
            ).expandEnvRefs(
                lookup({
                    MIRAGON_CID: "cid",
                    MIRAGON_SECRET: "sec",
                    MIRAGON_IDP: "https://idp",
                    MIRAGON_AUD: "aud",
                }),
            );
            expect(resolved).toEqual(new OAuth2Auth("cid", "sec", "https://idp/token", "aud"));
        });

        it("expands a padded whole basic ref without the padding", () => {
            const resolved = new BasicAuth(
                " ${env:MIRAGON_USER}",
                "  ${env:MIRAGON_PW}  ",
            ).expandEnvRefs(lookup({ MIRAGON_USER: "u", MIRAGON_PW: "s3cret" }));

            expect(resolved).toEqual(new BasicAuth("u", "s3cret"));
        });

        it("expands a padded whole oauth2 client ref without the padding", () => {
            const resolved = new OAuth2Auth(
                "${env:MIRAGON_CID} ",
                "\t${env:MIRAGON_SECRET}\n",
                "https://idp/token",
                "aud",
            ).expandEnvRefs(lookup({ MIRAGON_CID: "cid", MIRAGON_SECRET: "sec" }));

            expect(resolved).toEqual(new OAuth2Auth("cid", "sec", "https://idp/token", "aud"));
        });

        it("keeps padded literals and partial interpolation in credentials as typed", () => {
            expect(
                new BasicAuth(" admin ", " p-${env:MIRAGON_PW} ").expandEnvRefs(
                    lookup({ MIRAGON_PW: "x" }),
                ),
            ).toEqual(new BasicAuth(" admin ", " p-x "));
        });

        it.each([
            ["auth.username", new BasicAuth("${env:MIRAGON_U}", "p"), "MIRAGON_U"],
            ["auth.password", new BasicAuth("u", "${env:MIRAGON_P}"), "MIRAGON_P"],
            [
                "auth.clientId",
                new OAuth2Auth("${env:MIRAGON_CID}", "s", "https://idp/token", "aud"),
                "MIRAGON_CID",
            ],
            [
                "auth.clientSecret",
                new OAuth2Auth("cid", "${env:MIRAGON_S}", "https://idp/token", "aud"),
                "MIRAGON_S",
            ],
            [
                "auth.tokenEndpoint",
                new OAuth2Auth("cid", "s", "${env:MIRAGON_IDP}/token", "aud"),
                "MIRAGON_IDP",
            ],
            [
                "auth.audience",
                new OAuth2Auth("cid", "s", "https://idp/token", "${env:MIRAGON_AUD}"),
                "MIRAGON_AUD",
            ],
        ])("names the JSON field %s of an unset variable", (field, auth, variable) => {
            const error = errorFrom(() => auth.expandEnvRefs(lookup({})));

            expect(error).toBeInstanceOf(UnresolvedEnvVariableError);
            expect(error).toMatchObject({ field, variable });
        });

        it.each([
            ["auth.tokenEndpoint", new OAuth2Auth("cid", "s", "${env:HOME}/token", "aud")],
            ["auth.audience", new OAuth2Auth("cid", "s", "https://idp/token", "${env:MIRAGON_}")],
        ])("rejects a disallowed ref in %s on expansion", (field, auth) => {
            const error = errorFrom(() => auth.expandEnvRefs(lookup({ HOME: "/Users/me" })));

            expect(error).toBeInstanceOf(DisallowedEnvReferenceError);
            expect(error).toMatchObject({ field });
        });

        it("returns NoAuth untouched", () => {
            const auth = new NoAuth();
            expect(auth.expandEnvRefs(lookup({}))).toBe(auth);
        });

        it("expands the connection fields of a config and leaves the original literal", () => {
            const config = completeBuilder()
                .withEndpoint("${env:MIRAGON_URL}")
                .withTenantId("${env:MIRAGON_TENANT}")
                .withEngine("c8")
                .withAdditionalFilePaths(["/abs/form.form"])
                .withDeployUrl("${env:MIRAGON_URL}/deployment/create")
                .withAuth(new BasicAuth("${env:MIRAGON_USER}", "${env:MIRAGON_PASS}"))
                .build();
            const resolved = config.expandEnvRefs(
                lookup({
                    MIRAGON_URL: "https://c.example",
                    MIRAGON_TENANT: "acme",
                    MIRAGON_USER: "u",
                    MIRAGON_PASS: "p",
                }),
            );
            expect(resolved).toMatchObject({
                deploymentName: "my-process",
                endpoint: "https://c.example",
                tenantId: "acme",
                engine: "c8",
                mainFilePath: "/abs/main.bpmn",
                additionalFilePaths: ["/abs/form.form"],
                deployUrl: "https://c.example/deployment/create",
                auth: new BasicAuth("u", "p"),
            });
            expect(config.endpoint).toBe("${env:MIRAGON_URL}");
            expect(config.tenantId).toBe("${env:MIRAGON_TENANT}");
            expect(config.deployUrl).toBe("${env:MIRAGON_URL}/deployment/create");
            expect(config.auth).toEqual(
                new BasicAuth("${env:MIRAGON_USER}", "${env:MIRAGON_PASS}"),
            );
        });

        it.each([
            ["endpoint", completeBuilder().withEndpoint("${env:MIRAGON_URL}"), "MIRAGON_URL"],
            ["tenantId", completeBuilder().withTenantId("${env:MIRAGON_TENANT}"), "MIRAGON_TENANT"],
            [
                "endpoints.deploy",
                completeBuilder().withDeployUrl("${env:MIRAGON_GW}/deploy"),
                "MIRAGON_GW",
            ],
            [
                "auth.password",
                completeBuilder().withAuth(new BasicAuth("admin", "${env:MIRAGON_PW}")),
                "MIRAGON_PW",
            ],
        ])("names the JSON field %s of an unset variable", (field, builder, variable) => {
            const config = builder.build();

            const error = errorFrom(() => config.expandEnvRefs(lookup({})));

            expect(error).toBeInstanceOf(UnresolvedEnvVariableError);
            expect(error).toMatchObject({ field, variable });
        });

        it.each([
            ["endpoint", completeBuilder().withEndpoint("${env:HOME}/engine-rest")],
            ["tenantId", completeBuilder().withTenantId("${env:TENANT}")],
            ["endpoints.deploy", completeBuilder().withDeployUrl("${env:HOME}/deploy")],
            [
                "auth.password",
                completeBuilder().withAuth(new BasicAuth("admin", "${env:GITHUB_TOKEN}")),
            ],
        ])(
            "rejects a foreign ref in %s even when the lookup could resolve it",
            (field, builder) => {
                const config = builder.build();
                const foreignLookup = lookup({
                    HOME: "/Users/me",
                    TENANT: "acme",
                    GITHUB_TOKEN: "ghp_secret",
                });

                const error = errorFrom(() => config.expandEnvRefs(foreignLookup));

                expect(error).toBeInstanceOf(DisallowedEnvReferenceError);
                expect(error).toMatchObject({ field });
            },
        );

        it.each([
            ["empty", ""],
            ["blank", "   "],
        ])(
            "falls back to the convention route when the deploy URL variable is %s",
            (_desc, value) => {
                const config = completeBuilder().withDeployUrl("${env:MIRAGON_DEPLOY_URL}").build();

                expect(
                    config.expandEnvRefs(lookup({ MIRAGON_DEPLOY_URL: value })).deployUrl,
                ).toBeUndefined();
            },
        );

        it("trims the expanded deploy URL like a typed one", () => {
            const config = completeBuilder().withDeployUrl("${env:MIRAGON_DEPLOY_URL}").build();

            expect(
                config.expandEnvRefs(lookup({ MIRAGON_DEPLOY_URL: "  https://gw/deploy  " }))
                    .deployUrl,
            ).toBe("https://gw/deploy");
        });

        it.each([
            ["empty", ""],
            ["blank", "   "],
        ])("rejects an endpoint whose variable is %s", (_desc, value) => {
            const config = completeBuilder().withEndpoint("${env:MIRAGON_URL}").build();

            expect(() => config.expandEnvRefs(lookup({ MIRAGON_URL: value }))).toThrow(
                new InvalidDeploymentConfigError(["endpoint"]),
            );
        });

        it("accepts a tenant variable set to an empty value", () => {
            const config = completeBuilder().withTenantId("${env:MIRAGON_TENANT}").build();

            expect(config.expandEnvRefs(lookup({ MIRAGON_TENANT: "" })).tenantId).toBe("");
        });
    });
});
