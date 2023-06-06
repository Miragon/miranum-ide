package io.miragon.miranum.deploymentserver.mapper;

import io.miragon.miranum.deploymentserver.domain.Deployment;
import io.miragon.miranum.deploymentserver.domain.DeploymentStatus;
import org.mapstruct.Mapper;

@Mapper
public interface DeploymentMapper {

    io.miragon.miranum.deploymentreceiver.domain.Deployment mapDeployment(Deployment deployment);

    DeploymentStatus mapDeploymentStatus(io.miragon.miranum.deploymentreceiver.domain.DeploymentStatus deploymentStatus);

}
