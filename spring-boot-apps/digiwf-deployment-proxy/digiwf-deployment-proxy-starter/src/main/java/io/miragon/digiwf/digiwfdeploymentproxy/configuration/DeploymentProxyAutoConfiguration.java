package io.miragon.digiwf.digiwfdeploymentproxy.configuration;

import io.miragon.digiwf.digiwfdeploymentproxy.DeploymentProxy;
import io.miragon.digiwf.digiwfdeploymentproxy.properties.DeploymentProxyProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@RequiredArgsConstructor
@Configuration
@ConditionalOnClass(DeploymentProxy.class)
@EnableConfigurationProperties(DeploymentProxyProperties.class)
public class DeploymentProxyAutoConfiguration {

    private final DeploymentProxyProperties properties;

    @Bean
    @ConditionalOnMissingBean
    public DeploymentProxy provideAutoconfiguration() {
        return new DeploymentProxy();
    }

}
