package io.miragon.miranum.deploymentreceiver.application.ports.out;

import io.miragon.miranum.deploymentreceiver.domain.Deployment;

import java.util.List;

/**
 * Interface for miranum deployment.
 */
public interface MiranumDeploymentReceiver {

    /**
     * Deploy a file.
     *
     * @param file      the file to deploy
     * @param type      the type of the file
     * @param namespace a unique namespace for the process
     * @param tags      a list of tags to version the deployment
     */
    void deploy(final Deployment deployment, final List<String> tags);

}
