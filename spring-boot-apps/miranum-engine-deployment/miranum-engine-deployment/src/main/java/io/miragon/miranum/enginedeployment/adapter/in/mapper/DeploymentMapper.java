package io.miragon.miranum.enginedeployment.adapter.in.mapper;

import io.miragon.miranum.enginedeployment.adapter.in.event.DeploymentEvent;
import io.miragon.miranum.enginedeployment.model.DeploymentModel;
import org.mapstruct.Mapper;

@Mapper
public interface DeploymentMapper {

    DeploymentModel mapToDeploymentModel(final DeploymentEvent event);

}
