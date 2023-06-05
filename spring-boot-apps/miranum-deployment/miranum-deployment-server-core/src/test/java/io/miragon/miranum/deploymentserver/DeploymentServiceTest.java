package io.miragon.miranum.deploymentserver;

import io.miragon.miranum.deploymentserver.dto.ArtifactDto;
import io.miragon.miranum.deploymentserver.dto.DeploymentDto;
import io.miragon.miranum.deploymentserver.dto.DeploymentSuccessDto;
import io.miragon.miranum.deploymentserver.dto.FileDto;
import io.miragon.miranum.deploymentserver.handler.DryHandler;
import io.miragon.miranum.deploymentserver.service.DeploymentService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.validation.ConstraintViolationException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

class DeploymentServiceTest {

    private DeploymentService deploymentService;
    // fixtures
    private final List<ArtifactDto> artifacts = new ArrayList<>();
    private final String target = "test";

    @BeforeEach
    void setup() {
        this.deploymentService = new DeploymentService(Collections.singletonMap("test", new DryHandler()));

        FileDto file = FileDto.builder().name("file.bpmn").content("dummy").extension(".bpmn").size(1).build();
        ArtifactDto artifact = ArtifactDto.builder().type("BPMN").project("my-project").file(file).build();
        this.artifacts.add(artifact);
        file = FileDto.builder().name("file.dmn").content("dummy").extension(".dmn").size(1).build();
        artifact = ArtifactDto.builder().type("DMN").project("my-project").file(file).build();
        this.artifacts.add(artifact);
        file = FileDto.builder().name("file.schema.json").content("dummy").extension(".json").size(1).build();
        artifact = ArtifactDto.builder().type("FORM").project("my-project").file(file).build();
        this.artifacts.add(artifact);
        file = FileDto.builder().name("file.json").content("dummy").extension(".json").size(1).build();
        artifact = ArtifactDto.builder().type("CONFIG").project("my-project").file(file).build();
        this.artifacts.add(artifact);
    }

    @Test
    void successfulDeploymentTest() {
        this.artifacts.forEach(artifact -> {
            final DeploymentDto deployment = DeploymentDto.builder().target(this.target).artifact(artifact).build();
            final DeploymentSuccessDto result = this.deploymentService.deploy(deployment);
            Assertions.assertTrue(result.isSuccess());
            Assertions.assertEquals(deployment, result.getDeployment());
            Assertions.assertNotNull(result.getMessage());
        });
    }

    @Test
    void validationTest() {
        final DeploymentDto invalidDeployment = DeploymentDto.builder().build();
        Assertions.assertThrows(ConstraintViolationException.class, () -> this.deploymentService.deploy(invalidDeployment));

        final ArtifactDto invalidArtifact = ArtifactDto.builder().build();
        final DeploymentDto deployment = DeploymentDto.builder().target(this.target).artifact(invalidArtifact).build();
        Assertions.assertThrows(ConstraintViolationException.class, () -> this.deploymentService.deploy(deployment));
    }

    @Test
    void handlerNotFoundTest() {
        final DeploymentDto deploymentWithoutHandler = DeploymentDto.builder().target("invalid-target").artifact(this.artifacts.get(0)).build();
        final Exception ex = Assertions.assertThrows(RuntimeException.class, () -> this.deploymentService.deploy(deploymentWithoutHandler));
        Assertions.assertTrue(ex.getMessage().contains(deploymentWithoutHandler.getTarget()));
    }

}
