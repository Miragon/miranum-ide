package io.miragon.miranum.enginedeployment.adapter.out;

import io.miragon.miranum.enginedeployment.application.port.out.ArtifactDeploymentPort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

@ConditionalOnMissingBean(ArtifactDeploymentPort.class)
@Component
public class DefaultEngineAdapter implements ArtifactDeploymentPort {

    @Override
    public boolean deployArtifact() {
        return true;
    }

}
