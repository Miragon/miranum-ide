package io.miragon.miranum.deploymentreceiver.application.usecase;

import io.miragon.miranum.deploymentreceiver.application.DeploymentFailedException;
import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeploymentReceiver;
import io.miragon.miranum.deploymentreceiver.domain.Deployment;
import io.miragon.miranum.deploymentreceiver.domain.DeploymentStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.util.List;

class DeployFileUseCaseTest {

    private final MiranumDeploymentReceiver miranumDeployment = Mockito.mock(MiranumDeploymentReceiver.class);
    private final DeployFileUseCase deployFileUseCase = new DeployFileUseCase(miranumDeployment);

    @Test
    void testDeploy_SuccessfulDeployment() {
        final Deployment deployment = Deployment.builder()
            .file("test.bpmn")
            .type("bpmn")
            .namespace("test-namespace")
            .tags(List.of("tag1", "tag2"))
            .build();

        final DeploymentStatus result = deployFileUseCase.deploy(deployment);

        final ArgumentCaptor<List<String>> argumentCaptor = ArgumentCaptor.forClass(List.class);

        Mockito.verify(miranumDeployment).deploy(
            Mockito.any(),
            Mockito.any(),
            Mockito.any(),
            argumentCaptor.capture()
        );

        Assertions.assertTrue(result.isSuccess());
        Assertions.assertEquals("Deployment was successful", result.getMessage());
        // make sure the list contains the default tag (LATEST)
        List.of("tag1", "tag2", "LATEST").forEach(tag -> Assertions.assertTrue(argumentCaptor.getValue().contains(tag)));
    }

    @Test
    void testDeploy_FailedDeployment() {
        final Deployment deployment = Deployment.builder()
            .file("test.bpmn")
            .type("bpmn")
            .namespace("test-namespace")
            .tags(List.of("tag1", "tag2"))
            .build();

        Mockito.doThrow(new DeploymentFailedException())
            .when(miranumDeployment)
            .deploy(Mockito.anyString(), Mockito.anyString(), Mockito.anyString(), Mockito.anyList());

        final DeploymentStatus result = deployFileUseCase.deploy(deployment);

        Assertions.assertFalse(result.isSuccess());
        Assertions.assertTrue(result.getMessage().contains("Deployment failed with error: "));
    }

}
