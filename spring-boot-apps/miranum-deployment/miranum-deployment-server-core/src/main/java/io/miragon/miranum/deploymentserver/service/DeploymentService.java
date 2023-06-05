package io.miragon.miranum.deploymentserver.service;

import io.miragon.miranum.deploymentserver.application.dto.DeploymentDto;
import io.miragon.miranum.deploymentserver.application.dto.DeploymentSuccessDto;
import io.miragon.miranum.deploymentserver.handler.DeploymentHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import javax.validation.*;
import java.util.Map;
import java.util.Set;

@RequiredArgsConstructor
@Slf4j
public class DeploymentService {

    private final ValidatorFactory validatorFactory = Validation.buildDefaultValidatorFactory();
    private final Map<String, DeploymentHandler> enabledDeploymentHandlers;

    public DeploymentSuccessDto deploy(final DeploymentDto deploymentDto) throws RuntimeException {
        final Validator validator = this.validatorFactory.getValidator();
        final Set<ConstraintViolation<DeploymentDto>> violations = validator.validate(deploymentDto);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }

        final DeploymentHandler handler = this.enabledDeploymentHandlers.get(deploymentDto.getTarget());
        if (handler == null) {
            final String msg = String.format("No handler found for target environment %s", deploymentDto.getTarget());
            log.warn(msg);
            throw new RuntimeException(msg);
        }

        return handler.deploy(deploymentDto);
    }
}
