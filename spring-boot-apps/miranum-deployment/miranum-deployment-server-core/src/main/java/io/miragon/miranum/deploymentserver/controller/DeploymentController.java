package io.miragon.miranum.deploymentserver.controller;

import io.miragon.miranum.deploymentserver.dto.DeploymentDto;
import io.miragon.miranum.deploymentserver.dto.DeploymentSuccessDto;
import io.miragon.miranum.deploymentserver.service.DeploymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RequiredArgsConstructor
@RestController
@RequestMapping("api/deployment")
@Tag(name = "DeploymentAPI", description = "Single API Endpoint for process artifact deployment")
public class DeploymentController {

    private final DeploymentService deploymentService;

    @PostMapping
    @Operation(description = "Deploy artifact")
    public DeploymentSuccessDto deployArtifact(final @RequestBody DeploymentDto deployment) {
        return this.deploymentService.deploy(deployment);
    }
}
