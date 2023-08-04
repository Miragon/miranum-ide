package io.miragon.miranum.deploymentreceiver.application.usecase;

import io.miragon.miranum.deploymentreceiver.application.DeploymentFailedException;
import io.miragon.miranum.deploymentreceiver.application.dto.DeploymentDto;
import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeploymentReceiver;
import io.miragon.miranum.deploymentreceiver.domain.Deployment;
import io.miragon.miranum.deploymentreceiver.domain.DeploymentStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import javax.validation.ConstraintViolationException;
import java.util.List;

class DeployFileUseCaseTest {

    private final MiranumDeploymentReceiver miranumDeployment = Mockito.mock(MiranumDeploymentReceiver.class);
    private final DeployFileUseCase deployFileUseCase = new DeployFileUseCase(miranumDeployment);

    @Test
    void testDeploy_SuccessfulDeployment() {
        final DeploymentDto deploymentDto = DeploymentDto.builder()
            .file("some file content")
            .type("bpmn")
            .filename("test.bpmn")
            .namespace("test-namespace")
            .tags(List.of("tag1", "tag2"))
            .build();

        final DeploymentStatus result = deployFileUseCase.deploy(deploymentDto);

        final ArgumentCaptor<Deployment> deploymentCaptor = ArgumentCaptor.forClass(Deployment.class);
        final ArgumentCaptor<List<String>> tagsCaptor = ArgumentCaptor.forClass(List.class);

        Mockito.verify(miranumDeployment).deploy(
            deploymentCaptor.capture(),
            tagsCaptor.capture()
        );

        Assertions.assertTrue(result.isSuccess());
        Assertions.assertEquals("Deployment was successful", result.getMessage());

        Assertions.assertEquals(deploymentCaptor.getValue().getFile(), deploymentDto.getFile());
        Assertions.assertEquals(deploymentCaptor.getValue().getType(), deploymentDto.getType());
        Assertions.assertEquals(deploymentCaptor.getValue().getFilename(), deploymentDto.getFilename());
        Assertions.assertEquals(deploymentCaptor.getValue().getNamespace(), deploymentDto.getNamespace());
        // make sure the list contains the default tag (LATEST)
        List.of("tag1", "tag2", "LATEST").forEach(tag -> Assertions.assertTrue(tagsCaptor.getValue().contains(tag)));
    }

    @Test
    void testDeploy_FailedDeployment() {
        final DeploymentDto deploymentDto = DeploymentDto.builder()
            .file("test.bpmn")
            .filename("test.bpmn")
            .type("bpmn")
            .namespace("test-namespace")
            .tags(List.of("tag1", "tag2"))
            .build();

        Mockito.doThrow(new DeploymentFailedException())
            .when(miranumDeployment)
            .deploy(Mockito.any(), Mockito.anyList());

        final DeploymentStatus result = deployFileUseCase.deploy(deploymentDto);

        Assertions.assertFalse(result.isSuccess());
        Assertions.assertTrue(result.getMessage().contains("Deployment failed with error: "));
    }

    @Test
    void validationTest() {
        final DeploymentDto invalidDeployment = DeploymentDto.builder().build();
        Assertions.assertThrows(ConstraintViolationException.class, () -> this.deployFileUseCase.deploy(invalidDeployment));
    }

}
