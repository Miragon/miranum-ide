package io.miragon.miranum.miranumdeploymentproxy.handler.springcloudstream.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class EngineDeploymentStatusDto {
    private boolean success;
    private String deploymentId;
    private String message;
}
