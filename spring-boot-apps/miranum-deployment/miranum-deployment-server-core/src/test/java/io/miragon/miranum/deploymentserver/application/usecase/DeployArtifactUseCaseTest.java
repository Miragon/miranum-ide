package io.miragon.miranum.deploymentserver.application.usecase;

import io.miragon.miranum.deploymentserver.application.dto.ArtifactDto;
import io.miragon.miranum.deploymentserver.application.dto.DeploymentDto;
import io.miragon.miranum.deploymentserver.application.dto.DeploymentSuccessDto;
import io.miragon.miranum.deploymentserver.application.dto.FileDto;
import io.miragon.miranum.deploymentserver.application.ports.in.DeployArtifact;
import io.miragon.miranum.deploymentserver.application.ports.out.DeployFilePort;
import io.miragon.miranum.deploymentserver.domain.Deployment;
import io.miragon.miranum.deploymentserver.domain.DeploymentStatus;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import javax.validation.ConstraintViolationException;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DeployArtifactUseCaseTest {

    private final DeployFilePort deployFilePort = mock(DeployFilePort.class);
    private final DeployArtifact deployArtifactUseCase = new DeployArtifactUseCase(deployFilePort);

    @Test
    void testDeploy_SuccessfulDeployment() {
        final ArtifactDto artifactDto = ArtifactDto.builder()
            .file(new FileDto("test", "fileContent", "text/plain", 123L))
            .type("txt")
            .project("dummy-project")
            .build();
        final DeploymentDto deploymentDto = DeploymentDto.builder()
            .artifact(artifactDto)
            .target("dummy-target")
            .build();
        deploymentDto.setArtifact(artifactDto);

        final DeploymentStatus deploymentStatus = new DeploymentStatus(true, "Deployment successful");
        when(deployFilePort.deploy(Mockito.any(Deployment.class))).thenReturn(deploymentStatus);


        final DeploymentSuccessDto result = this.deployArtifactUseCase.deploy(deploymentDto);


        Assertions.assertTrue(result.isSuccess());
        Assertions.assertEquals(deploymentDto, result.getDeployment());
        Assertions.assertEquals("Deployment successful", result.getMessage());
    }

    @Test
    void testDeploy_FailedDeployment() {
        final ArtifactDto artifactDto = ArtifactDto.builder()
            .file(new FileDto("test", "fileContent", "text/plain", 123L))
            .type("txt")
            .project("dummy-project")
            .build();
        final DeploymentDto deploymentDto = DeploymentDto.builder()
            .artifact(artifactDto)
            .target("dummy-target")
            .build();
        deploymentDto.setArtifact(artifactDto);

        final DeploymentStatus deploymentStatus = new DeploymentStatus(false, "Deployment failed");
        when(deployFilePort.deploy(Mockito.any(Deployment.class))).thenReturn(deploymentStatus);


        final DeploymentSuccessDto result = this.deployArtifactUseCase.deploy(deploymentDto);


        Assertions.assertFalse(result.isSuccess());
        Assertions.assertEquals(deploymentDto, result.getDeployment());
        Assertions.assertEquals("Deployment failed", result.getMessage());
    }

    @Test
    void validationTest() {
        final DeploymentDto invalidDeployment = DeploymentDto.builder().build();
        Assertions.assertThrows(ConstraintViolationException.class, () -> this.deployArtifactUseCase.deploy(invalidDeployment));

        final ArtifactDto invalidArtifact = ArtifactDto.builder().build();
        final DeploymentDto deployment = DeploymentDto.builder().target("test").artifact(invalidArtifact).build();
        Assertions.assertThrows(ConstraintViolationException.class, () -> this.deployArtifactUseCase.deploy(deployment));
    }
}
