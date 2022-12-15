package io.miragon.miranum.digiwfdeploymentproxy.controller;

import io.miragon.miranum.digiwfdeploymentproxy.dto.DeploymentSuccessDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<DeploymentSuccessDto> handleRuntimeExceptions(final RuntimeException exception) {
        final DeploymentSuccessDto deploymentSuccessDto =  DeploymentSuccessDto.builder()
            .success(false)
            .message(exception.getMessage())
            .build();
        return new ResponseEntity<>(deploymentSuccessDto, HttpStatus.BAD_REQUEST);
    }
}
