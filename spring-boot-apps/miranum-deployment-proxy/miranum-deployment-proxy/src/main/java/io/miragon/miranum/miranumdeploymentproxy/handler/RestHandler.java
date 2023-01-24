package io.miragon.miranum.miranumdeploymentproxy.handler;

import io.miragon.miranum.miranumdeploymentproxy.dto.DeploymentDto;
import io.miragon.miranum.miranumdeploymentproxy.dto.DeploymentSuccessDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

@RequiredArgsConstructor
@Slf4j
public class RestHandler implements DeploymentHandler {

    private final HttpClient client = HttpClient.newBuilder().build();
    private final Map<String, String> targetEnvs;

    @Override
    public DeploymentSuccessDto deploy(final DeploymentDto deploymentDto) {
        try {
            final String baseUrl = targetEnvs.get(deploymentDto.getTarget()) + "/rest/";
            HttpRequest.Builder request = HttpRequest.newBuilder();
            switch (deploymentDto.getArtifact().getType()) {
                case "bpmn":
                case "dmn":
                    final JSONObject json = new JSONObject();
                    json.put("deploymentId", deploymentDto.getArtifact().getArtifactName());
                    json.put("versionId", "latest");
                    json.put("target", deploymentDto.getTarget());
                    json.put("file", deploymentDto.getArtifact().getFile().getContent());
                    json.put("artifactType", deploymentDto.getArtifact().getType());
                    request = request
                        .uri(new URI(baseUrl + "deployment"))
                        .POST(HttpRequest.BodyPublishers.ofString(json.toString()));
                    break;
                case "form":
                    request = request
                        .uri(new URI(baseUrl + "jsonschema"))
                        .POST(HttpRequest.BodyPublishers.ofString(deploymentDto.getArtifact().getFile().getContent()));
                    break;
                case "config":
                    request = request
                        .uri(new URI(baseUrl + "processconfig"))
                        .POST(HttpRequest.BodyPublishers.ofString(deploymentDto.getArtifact().getFile().getContent()));
                    break;
                default:
                    final String msg = String.format("File type %s not supported", deploymentDto.getArtifact().getType());
                    log.warn(msg);
                    return DeploymentSuccessDto.builder()
                        .success(false)
                        .message(msg)
                        .build();
            }

            // http request
            request = request
                .setHeader("Content-Type", "application/json");
            final HttpResponse<String> response = client.send(request.build(), HttpResponse.BodyHandlers.ofString());
            log.debug(response.toString());

            final String message = String.format("Deploy artifact %s to target %s with http status %s", deploymentDto.getArtifact().getArtifactName(), deploymentDto.getTarget(), response.statusCode());
            log.info(message);
            return DeploymentSuccessDto.builder()
                .success(response.statusCode() < 400)
                .deployment(deploymentDto)
                .message(message)
                .build();
        }
        catch (URISyntaxException | IOException | InterruptedException ex) {
            log.warn(ex.getMessage());
            return DeploymentSuccessDto.builder()
                .success(false)
                .message(ex.getMessage())
                .build();
        }
    }
}
