package com.jaghan.missionwatch.ingest.ll2;

import com.jaghan.missionwatch.config.MissionWatchProperties;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** Wires the Launch Library 2 client: base URL, identifying User-Agent, timeouts and rate budget. */
@Configuration(proxyBeanMethods = false)
class Ll2Config {

    @Bean
    Ll2Client ll2Client(RestClient.Builder builder, MissionWatchProperties properties, Clock clock) {
        MissionWatchProperties.Ll2 ll2 = properties.ll2();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        RestClient http = builder.clone()
                .baseUrl(ll2.baseUrl().toString())
                .defaultHeader(HttpHeaders.USER_AGENT, ll2.userAgent())
                .requestFactory(requestFactory)
                .build();
        return new Ll2Client(http, new RateBudget(ll2.requestsPerHour(), clock), ll2.listLimit());
    }
}
