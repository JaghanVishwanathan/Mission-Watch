package com.jaghan.missionwatch.config;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of the {@code missionwatch.*} settings in application.yml. */
@ConfigurationProperties("missionwatch")
public record MissionWatchProperties(Ll2 ll2, Freshness freshness, Cors cors) {

    /** Launch Library 2 integration. */
    public record Ll2(
            URI baseUrl,
            int requestsPerHour,
            int listLimit,
            boolean refreshEnabled,
            Duration upcomingRefresh,
            Duration previousRefresh,
            String userAgent) {}

    /** When stored data counts as stale in response metadata. */
    public record Freshness(Duration staleAfter) {}

    /** Browser origins allowed to call the API (the Angular dev server and the public site). */
    public record Cors(List<String> allowedOrigins) {}
}
