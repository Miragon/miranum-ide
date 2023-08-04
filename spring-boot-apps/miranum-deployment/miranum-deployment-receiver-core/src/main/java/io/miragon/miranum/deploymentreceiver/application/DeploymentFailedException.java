package io.miragon.miranum.deploymentreceiver.application;

import lombok.NoArgsConstructor;

/**
 * Exception thrown when a deployment failed.
 */
@NoArgsConstructor
public class DeploymentFailedException extends RuntimeException {

    public DeploymentFailedException(String message) {
        super(message);
    }
}
