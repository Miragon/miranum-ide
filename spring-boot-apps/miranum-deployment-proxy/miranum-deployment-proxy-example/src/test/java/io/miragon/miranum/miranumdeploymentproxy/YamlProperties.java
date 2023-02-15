package io.miragon.miranum.miranumdeploymentproxy;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "yaml")
@PropertySource(value = "classpath:application-test.yaml", factory = YamlPropertySourceFactory.class)
public class YamlProperties {

    private String name;

    private List<String> aliases;

}
