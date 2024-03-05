package io.miragon.miranum.deploymentserver.deployment;

import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeploymentReceiver;
import io.miragon.miranum.deploymentreceiver.domain.Deployment;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class ExampleDeploymentReceiver implements MiranumDeploymentReceiver {

    @Override
    public void deploy(final Deployment deployment) {
        log.info("Deploy file {} of type {} to namespace {} with tags {}",
            deployment.getFilename(), deployment.getType(), deployment.getNamespace(), deployment.getTags());
    }

}
