package io.miragon.miranum.deploymentserver.adapter.in.rest;

import io.miragon.miranum.deploymentserver.application.dto.DeploymentSuccessDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
@Slf4j
public class ApiExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<DeploymentSuccessDto> handleRuntimeExceptions(final RuntimeException exception) {
        log.error("Error during deployment", exception);
        final DeploymentSuccessDto deploymentSuccessDto = DeploymentSuccessDto.builder()
            .success(false)
            .message(exception.getMessage())
            .build();
        return new ResponseEntity<>(deploymentSuccessDto, HttpStatus.BAD_REQUEST);
    }
}
