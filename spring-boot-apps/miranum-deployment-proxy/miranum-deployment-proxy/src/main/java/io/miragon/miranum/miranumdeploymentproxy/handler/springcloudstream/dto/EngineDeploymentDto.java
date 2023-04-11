package io.miragon.miranum.miranumdeploymentproxy.handler.springcloudstream.dto;

import lombok.*;

@Data
@Builder
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class EngineDeploymentDto {
    private String deploymentId;
    private String versionId;
    private String target;
    private String file;
    private String artifactType;
}
