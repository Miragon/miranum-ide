package io.miragon.miranum.miranumdeploymentproxy.handler.springcloudstream.dto;

import lombok.*;

@Data
@Builder
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class EngineDeploymentStatusDto {
    private boolean success;
    private String deploymentId;
    private String message;
}
