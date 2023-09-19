package io.miragon.miranum.deploymentserver.deployment;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class DeploymentDto {
    private String deploymentId;
    private String versionId;
    private String target;
    private String file;
    private String artifactType;
}
