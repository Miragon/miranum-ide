package io.miragon.miranum.deploymentreceiver.adapter.in.rest;

import io.miragon.miranum.deploymentreceiver.application.dto.DeploymentDto;
import io.miragon.miranum.deploymentreceiver.application.ports.in.DeployFile;
import io.miragon.miranum.deploymentreceiver.domain.Deployment;
import io.miragon.miranum.deploymentreceiver.domain.DeploymentStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class DeploymentControllerTest {

    private DeploymentReceiverController deploymentController;
    private final DeployFile deployFile = Mockito.mock(DeployFile.class);

    @BeforeEach
    void setUp() {
        this.deploymentController = new DeploymentReceiverController(this.deployFile);
    }

    @Test
    void deployTest() {
        final DeploymentDto deploymentDto = DeploymentDto.builder()
            .file("foobar")
            .filename("foo.bar")
            .namespace("test")
            .type("bpmn")
            .tags(null)
            .build();

        Mockito.when(this.deployFile.deploy(deploymentDto)).thenReturn(DeploymentStatus.builder()
            .success(true)
            .message("test")
            .build());
        final DeploymentStatus result = this.deploymentController.deploy(deploymentDto);

        Assertions.assertTrue(result.isSuccess());
        Assertions.assertEquals("test", result.getMessage());
    }
}
