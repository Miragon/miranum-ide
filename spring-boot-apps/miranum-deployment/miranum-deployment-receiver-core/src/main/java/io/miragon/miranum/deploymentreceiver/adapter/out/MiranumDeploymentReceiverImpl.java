package io.miragon.miranum.deploymentreceiver.adapter.out;

import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeploymentReceiver;
import io.miragon.miranum.deploymentreceiver.domain.Deployment;

import java.util.List;


public class MiranumDeploymentReceiverImpl implements MiranumDeploymentReceiver {

    @Override
    public void deploy(final Deployment deployment, final List<String> tags) {
        // Implement this method in your application
    }
}
