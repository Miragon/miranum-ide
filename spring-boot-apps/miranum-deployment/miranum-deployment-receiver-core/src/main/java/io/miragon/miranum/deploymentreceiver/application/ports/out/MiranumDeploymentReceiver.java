package io.miragon.miranum.deploymentreceiver.application.ports.out;

import io.miragon.miranum.deploymentreceiver.domain.Deployment;

/**
 * Interface for miranum deployment.
 */
public interface MiranumDeploymentReceiver {

    /**
     * Deploy a file.
     *
     * @param deployment the deployment
     */
    void deploy(final Deployment deployment);

}
