import * as http from "http";
import * as https from "https";

import { DeploymentConfig, DeploymentResult } from "../domain/deployment";
import { DeploymentFailedError } from "../domain/errors";

/**
 * HTTP client that posts BPMN/DMN resources to a Camunda REST API.
 *
 * Uses Node's built-in `http`/`https` modules to avoid adding external
 * dependencies to the extension. Supports both Camunda Platform 7 and
 * Camunda Cloud 8 via different endpoint paths.
 *
 * Route logic:
 *   - C7: `POST {endpoint}/deployment/create`   (Camunda REST API v7)
 *   - C8: `POST {endpoint}/v1/deployments`       (Camunda REST API v8)
 */
export class CamundaRestClient {
    /**
     * Sends a multipart/form-data deployment request to the Camunda REST API.
     *
     * Reads file contents from `fileContents` (filename → UTF-8 string), builds
     * the multipart body, and POSTs to the correct path for the target engine.
     *
     * @param config Validated deployment configuration.
     * @param fileContents Map of filename (basename) → UTF-8 file content.
     * @returns A {@link DeploymentResult} describing the outcome.
     * @throws {DeploymentFailedError} If the server returns a non-2xx status.
     */
    async deploy(
        config: DeploymentConfig,
        fileContents: Map<string, string>,
    ): Promise<DeploymentResult> {
        const { body, boundary } = this.buildMultipart(config, fileContents);

        const urlPath =
            config.engine === "c7" ? "/deployment/create" : "/v1/deployments";

        const baseEndpoint = config.endpoint.replace(/\/$/, "");
        const fullUrl = `${baseEndpoint}${urlPath}`;

        const { status, body: responseBody } = await this.sendRequest(
            fullUrl,
            body,
            boundary,
        );

        if (status < 200 || status >= 300) {
            throw new DeploymentFailedError(status, responseBody);
        }

        // Attempt to extract a deployment ID from the JSON response.
        let deploymentId: string | undefined;
        try {
            const json = JSON.parse(responseBody);
            // C7 response has `id`, C8 response has `deploymentKey`
            deploymentId =
                json.id !== undefined
                    ? String(json.id)
                    : json.deploymentKey !== undefined
                      ? String(json.deploymentKey)
                      : undefined;
        } catch {
            // Response was not valid JSON — deploymentId remains undefined.
        }

        return new DeploymentResult(
            true,
            `Deployment '${config.deploymentName}' succeeded.`,
            deploymentId,
        );
    }

    /**
     * Assembles a multipart/form-data body buffer including all deployment
     * metadata fields and file parts.
     *
     * For C7 deployments the body includes `deployment-name`, `tenant-id` (when
     * non-empty), and `deployment-source`.  For C8 the metadata fields are
     * omitted — only the resource files are included.
     *
     * @param config Validated deployment configuration.
     * @param fileContents Map of filename → UTF-8 content.
     * @returns An object containing the body `Buffer` and the `boundary` string.
     */
    private buildMultipart(
        config: DeploymentConfig,
        fileContents: Map<string, string>,
    ): { body: Buffer; boundary: string } {
        // A random boundary string; must not appear in the body content.
        const boundary = `----BpmnDeployBoundary${Date.now()}`;
        const parts: Buffer[] = [];

        const addField = (name: string, value: string): void => {
            parts.push(
                Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
                ),
            );
        };

        const addFile = (filename: string, content: string): void => {
            parts.push(
                Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="${filename}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
                ),
                Buffer.from(content, "utf-8"),
                Buffer.from("\r\n"),
            );
        };

        // C7-specific form fields
        if (config.engine === "c7") {
            addField("deployment-name", config.deploymentName);
            if (config.tenantId.trim()) {
                addField("tenant-id", config.tenantId);
            }
            addField("deployment-source", "BPMN Modeler");
        }

        // Attach all resource files
        for (const [filename, content] of fileContents) {
            addFile(filename, content);
        }

        parts.push(Buffer.from(`--${boundary}--\r\n`));

        return { body: Buffer.concat(parts), boundary };
    }

    /**
     * Sends an HTTP or HTTPS POST request with a multipart body.
     *
     * Automatically selects `http` or `https` based on the URL scheme.
     *
     * @param url Full URL to POST to.
     * @param body The multipart body buffer.
     * @param boundary The multipart boundary string.
     * @returns The HTTP status code and raw response body text.
     */
    private sendRequest(
        url: string,
        body: Buffer,
        boundary: string,
    ): Promise<{ status: number; body: string }> {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === "https:";
            const transport = isHttps ? https : http;

            const options: http.RequestOptions = {
                method: "POST",
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                    "Content-Length": body.length,
                },
            };

            const req = transport.request(options, (res) => {
                const chunks: Buffer[] = [];
                res.on("data", (chunk: Buffer) => chunks.push(chunk));
                res.on("end", () => {
                    resolve({
                        status: res.statusCode ?? 0,
                        body: Buffer.concat(chunks).toString("utf-8"),
                    });
                });
            });

            req.on("error", (err) => reject(err));
            req.write(body);
            req.end();
        });
    }
}
