package io.miragon.miranum.deploymentreceiver.domain;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class DeploymentStatus {
    private boolean success;
    private String message;
}
