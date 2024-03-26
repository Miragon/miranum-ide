package io.miragon.miranum.deploymentreceiver.application.usecase;

import io.miragon.miranum.deploymentreceiver.application.DeploymentFailedException;
import io.miragon.miranum.deploymentreceiver.application.dto.DeploymentDto;
import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeploymentReceiver;
import io.miragon.miranum.deploymentreceiver.domain.Deployment;
import io.miragon.miranum.deploymentreceiver.domain.DeploymentStatus;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

        Mockito.verify(miranumDeployment).deploy(
            deploymentCaptor.capture()
        );

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getMessage()).isEqualTo("Deployment was successful");

        assertThat(deploymentCaptor.getValue().getFile()).isEqualTo(deploymentDto.getFile());
        assertThat(deploymentCaptor.getValue().getType()).isEqualTo(deploymentDto.getType());
        assertThat(deploymentCaptor.getValue().getFilename()).isEqualTo(deploymentDto.getFilename());
        assertThat(deploymentCaptor.getValue().getNamespace()).isEqualTo(deploymentDto.getNamespace());
        // make sure the list contains the default tag (LATEST)
        List.of("tag1", "tag2", "LATEST").forEach(tag -> assertThat(deploymentCaptor.getValue().getTags()).contains(tag));
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
            .deploy(Mockito.any());

        final DeploymentStatus result = deployFileUseCase.deploy(deploymentDto);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getMessage()).contains("Deployment failed with error: ");
    }

    @Test
    void validationTest() {
        final DeploymentDto invalidDeployment = DeploymentDto.builder().build();
        assertThatThrownBy(() -> this.deployFileUseCase.deploy(invalidDeployment))
            .isInstanceOf(ConstraintViolationException.class);
    }

}
