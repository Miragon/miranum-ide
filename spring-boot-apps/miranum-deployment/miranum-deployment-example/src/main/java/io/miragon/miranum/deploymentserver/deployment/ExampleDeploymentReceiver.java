package io.miragon.miranum.deploymentserver.deployment;

import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeploymentReceiver;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Slf4j
public class ExampleDeploymentReceiver implements MiranumDeploymentReceiver {

    @Override
    public void deploy(String file, String type, String namespace, List<String> tags) {
        log.info("Deploy file {} of type {} to namespace {} with tags {}", file, type, namespace, tags);
    }

}
