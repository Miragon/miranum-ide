package io.miragon.miranum.deploymentreceiver.application.usecase;

import io.miragon.miranum.deploymentreceiver.application.DeploymentFailedException;
import io.miragon.miranum.deploymentreceiver.application.ports.in.DeployFile;
import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeployment;
import io.miragon.miranum.deploymentreceiver.domain.Deployment;
import io.miragon.miranum.deploymentreceiver.domain.DeploymentStatus;
import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

@RequiredArgsConstructor
public class DeployFileUseCase implements DeployFile {

    private final MiranumDeployment miranumDeployment;

    private final String DEFAULT_TAG = "LATEST";

    @Override
    public DeploymentStatus deploy(Deployment deployment) {
        try {
            // TODO make sure the namespace is set

            // make sure the default tag is set
            final Set<String> tags = new HashSet<>(deployment.getTags());
            tags.add(DEFAULT_TAG);

            miranumDeployment.deploy(
                deployment.getFile(),
                deployment.getType(),
                deployment.getNamespace(),
                new ArrayList<>(tags)
            );

            return new DeploymentStatus(true, "Deployment was successful");
        } catch (DeploymentFailedException exception) {
            return new DeploymentStatus(false, "Deployment failed with error: " + exception.getMessage());
        }
    }

}
