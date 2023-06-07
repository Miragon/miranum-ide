package io.miragon.miranum.deploymentserver.adapter.out;

import io.miragon.miranum.deploymentreceiver.application.ports.in.DeployFile;
import io.miragon.miranum.deploymentserver.application.ports.out.DeployFilePort;
import io.miragon.miranum.deploymentserver.domain.Deployment;
import io.miragon.miranum.deploymentserver.domain.DeploymentStatus;
import io.miragon.miranum.deploymentserver.mapper.DeploymentMapper;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class MiranumEmbeddedDeploymentTest {

    private DeployFilePort miranumEmbeddedDeployment;
    private final DeployFile deployFile = Mockito.mock(DeployFile.class);
    private final DeploymentMapper mapper = Mockito.mock(DeploymentMapper.class);

    @BeforeEach
    void setup() {
        miranumEmbeddedDeployment = new MiranumEmbeddedDeployment(this.deployFile, this.mapper);
    }

    @Test
    void deployTest() {
        final Deployment deployment = Deployment.builder()
            .file("foobar")
            .type("bpmn")
            .namespace("sampleNamespace")
            .tags(null)
            .build();
        final DeploymentStatus deploymentStatus = DeploymentStatus.builder()
            .success(true)
            .message("Deployment was successfully")
            .build();

        final io.miragon.miranum.deploymentreceiver.domain.Deployment mappedDeployment = io.miragon.miranum.deploymentreceiver.domain.Deployment.builder()
            .file(deployment.getFile())
            .type(deployment.getType())
            .namespace(deployment.getNamespace())
            .tags(deployment.getTags())
            .build();
        final io.miragon.miranum.deploymentreceiver.domain.DeploymentStatus mappedDeploymentStatus = io.miragon.miranum.deploymentreceiver.domain.DeploymentStatus.builder()
            .success(deploymentStatus.isSuccess())
            .message(deploymentStatus.getMessage())
            .build();

        Mockito.when(this.mapper.mapDeployment(deployment)).thenReturn(mappedDeployment);
        Mockito.when(this.mapper.mapDeploymentStatus(mappedDeploymentStatus)).thenReturn(deploymentStatus);

        Mockito.when(deployFile.deploy(mappedDeployment)).thenReturn(mappedDeploymentStatus);


        final DeploymentStatus result = this.miranumEmbeddedDeployment.deploy(deployment, "test");

        Assertions.assertTrue(result.isSuccess());
        Assertions.assertEquals("Deployment was successfully", result.getMessage());
    }

}
