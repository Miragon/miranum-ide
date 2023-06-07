package io.miragon.miranum.deploymentserver.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@AllArgsConstructor
@Builder
@Data
public class DeploymentStatus {
    private boolean success;
    private String message;
}
