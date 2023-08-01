package io.miragon.miranum.deploymentserver.adapter.in.rest;

import io.miragon.miranum.deploymentserver.application.dto.DeploymentDto;
import io.miragon.miranum.deploymentserver.application.dto.DeploymentSuccessDto;
import io.miragon.miranum.deploymentserver.application.ports.in.DeployArtifact;
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

    private final DeployArtifact deployArtifact;

    @PostMapping
    @Operation(description = "Deploy artifact")
    public DeploymentSuccessDto deployArtifact(final @RequestBody DeploymentDto deployment) {
        return this.deployArtifact.deploy(deployment);
    }
}
