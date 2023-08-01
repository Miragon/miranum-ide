package io.miragon.miranum.deploymentserver.adapter.in.rest;

import io.miragon.miranum.deploymentserver.application.dto.ArtifactDto;
import io.miragon.miranum.deploymentserver.application.dto.DeploymentDto;
import io.miragon.miranum.deploymentserver.application.dto.DeploymentSuccessDto;
import io.miragon.miranum.deploymentserver.application.dto.FileDto;
import io.miragon.miranum.deploymentserver.application.ports.in.DeployArtifact;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class DeploymentControllerTest {

    private DeploymentController deploymentController;
    private final DeployArtifact deployArtifact = Mockito.mock(DeployArtifact.class);

    @BeforeEach
    void setUp() {
        this.deploymentController = new DeploymentController(this.deployArtifact);
    }

    @Test
    void deployArtifactTest() {
        final FileDto fileDto = FileDto.builder()
            .name("test.bpmn")
            .content("foobar")
            .build();
        final ArtifactDto artifactDto = ArtifactDto.builder()
            .type("test")
            .project("test")
            .file(fileDto)
            .build();
        final DeploymentDto deploymentDto = DeploymentDto.builder()
            .target("test")
            .artifact(artifactDto)
            .build();

        Mockito.when(this.deployArtifact.deploy(deploymentDto)).thenReturn(DeploymentSuccessDto.builder()
            .success(true)
            .message("test")
            .build());

        final DeploymentSuccessDto status = this.deploymentController.deployArtifact(deploymentDto);

        Assertions.assertTrue(status.isSuccess());
        Assertions.assertEquals("test", status.getMessage());
    }

}
