package io.miragon.miranum.deploymentreceiver.application.usecase;

import io.miragon.miranum.deploymentreceiver.application.DeploymentFailedException;
import io.miragon.miranum.deploymentreceiver.application.dto.DeploymentDto;
import io.miragon.miranum.deploymentreceiver.application.ports.in.DeployFile;
import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeploymentReceiver;
import io.miragon.miranum.deploymentreceiver.domain.Deployment;
import io.miragon.miranum.deploymentreceiver.domain.DeploymentStatus;
import jakarta.validation.*;
import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

@RequiredArgsConstructor
public class DeployFileUseCase implements DeployFile {

    private final MiranumDeploymentReceiver miranumDeployment;
    private final ValidatorFactory validatorFactory = Validation.buildDefaultValidatorFactory();

    private final String DEFAULT_TAG = "LATEST";

    @Override
    public DeploymentStatus deploy(final DeploymentDto deploymentDto) {
        try {
            final Validator validator = this.validatorFactory.getValidator();
            final Set<ConstraintViolation<DeploymentDto>> violations = validator.validate(deploymentDto);
            if (!violations.isEmpty()) {
                throw new ConstraintViolationException(violations);
            }

            // make sure the default tag is set
            final Set<String> tags = new HashSet<>(deploymentDto.getTags());
            tags.add(DEFAULT_TAG);

            final Deployment deployment = Deployment.builder()
                .file(deploymentDto.getFile())
                .type(deploymentDto.getType())
                .filename(deploymentDto.getFilename())
                .namespace(deploymentDto.getNamespace())
                .tags(new ArrayList<>(tags))
                .build();

            miranumDeployment.deploy(deployment);

            return new DeploymentStatus(true, "Deployment was successful");
        } catch (DeploymentFailedException exception) {
            return new DeploymentStatus(false, "Deployment failed with error: " + exception.getMessage());
        }
    }

}
