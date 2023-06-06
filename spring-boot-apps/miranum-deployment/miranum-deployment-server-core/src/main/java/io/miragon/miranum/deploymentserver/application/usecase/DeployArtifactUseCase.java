package io.miragon.miranum.deploymentserver.application.usecase;

import io.miragon.miranum.deploymentserver.application.dto.DeploymentDto;
import io.miragon.miranum.deploymentserver.application.dto.DeploymentSuccessDto;
import io.miragon.miranum.deploymentserver.application.ports.in.DeployArtifact;
import io.miragon.miranum.deploymentserver.application.ports.out.DeployFilePort;
import io.miragon.miranum.deploymentserver.domain.Deployment;
import io.miragon.miranum.deploymentserver.domain.DeploymentStatus;
import lombok.RequiredArgsConstructor;

import javax.validation.*;
import java.util.List;
import java.util.Set;


@RequiredArgsConstructor
public class DeployArtifactUseCase implements DeployArtifact {

    private final DeployFilePort deployArtifactPort;
    private final ValidatorFactory validatorFactory = Validation.buildDefaultValidatorFactory();

    @Override
    public DeploymentSuccessDto deploy(DeploymentDto deploymentDto) {
        final Validator validator = this.validatorFactory.getValidator();
        final Set<ConstraintViolation<DeploymentDto>> violations = validator.validate(deploymentDto);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }

        final String file = deploymentDto.getArtifact().getFile().getContent();
        final String type = deploymentDto.getArtifact().getType();
        final String namespace = deploymentDto.getArtifact().getProject().replace(" ", "");
        // TODO tags not supported yet


        final DeploymentStatus status = this.deployArtifactPort.deploy(
            Deployment.builder()
                .file(file)
                .type(type)
                .namespace(namespace)
                .tags(List.of())
                .build(),
            deploymentDto.getTarget());

        return DeploymentSuccessDto.builder()
            .success(status.isSuccess())
            .deployment(deploymentDto)
            .message(status.getMessage())
            .build();
    }
}
