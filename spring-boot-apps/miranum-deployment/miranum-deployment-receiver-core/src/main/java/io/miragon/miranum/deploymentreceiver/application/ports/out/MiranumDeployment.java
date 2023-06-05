package io.miragon.miranum.deploymentreceiver.application.ports.out;

import java.util.List;

/**
 * Interface for miranum deployment.
 */
public interface MiranumDeployment {

    /**
     * Deploy a file.
     *
     * @param file      the file to deploy
     * @param type      the type of the file
     * @param namespace a unique namespace for the process
     * @param tags      a list of tags to version the deployment
     */
    void deploy(final String file, final String type, final String namespace, final List<String> tags);

}
