package io.miragon.miranum.deploymentreceiver.adapter.in.rest;

import io.miragon.miranum.deploymentreceiver.application.ports.in.DeployFile;
import io.miragon.miranum.deploymentreceiver.domain.Deployment;
import io.miragon.miranum.deploymentreceiver.domain.DeploymentStatus;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.validation.Valid;

@ConditionalOnMissingBean
@RestController
@RequestMapping("/rest/deployment")
@RequiredArgsConstructor
@Tag(name = "DeploymentController", description = "API to deploy bpmn and dmn artifacts")
public class DeploymentController {

    private final DeployFile deployFile;

    @PostMapping
    public DeploymentStatus deploy(@Valid @RequestBody final Deployment deployment) {
        return this.deployFile.deploy(deployment);
    }

}
