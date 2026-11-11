package com.jaghan.missionwatch.config;

import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Cross-cutting infrastructure: caching (Caffeine, see application.yml), scheduling and time. */
@Configuration(proxyBeanMethods = false)
@EnableCaching
@EnableScheduling
@EnableConfigurationProperties(MissionWatchProperties.class)
public class AppConfig {

    /** Injected wherever "now" matters, so tests can fix the time. */
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
