package io.miragon.miranum.deploymentreceiver.adapter.out;

import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeploymentReceiver;

import java.util.List;


public class MiranumDeploymentReceiverImpl implements MiranumDeploymentReceiver {

    @Override
    public void deploy(String file, String type, String namespace, List<String> tags) {
        // Implement this method in your application
    }
}
