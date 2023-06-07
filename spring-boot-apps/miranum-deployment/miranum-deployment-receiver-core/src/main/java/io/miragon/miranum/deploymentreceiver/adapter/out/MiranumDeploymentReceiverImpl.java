package io.miragon.miranum.deploymentreceiver.adapter.out;

import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeploymentReceiver;

import java.util.List;


public class MiranumDeploymentReceiverImpl implements MiranumDeploymentReceiver {

    @Override
    public void deploy(String file, String type, String namespace, List<String> tags) {
        System.out.printf("Deploy file %s of type %s to namespace %s with tags %s%n", file, type, namespace, tags);
    }
}
