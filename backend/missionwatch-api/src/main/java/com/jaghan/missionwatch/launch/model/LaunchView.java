package com.jaghan.missionwatch.launch.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.jaghan.missionwatch.provider.ProviderView;
import com.jaghan.missionwatch.snapshot.LaunchSnapshotView;
import java.util.List;

/**
 * A launch as served by the API. Field names and shapes match the frontend {@code Launch} model
 * (frontend/missionwatch-web/src/app/core/models/launch.ts), so the Angular adapter needs no
 * mapping. Times are ISO-8601 UTC strings, kept exactly as the source gave them. Missing values are
 * omitted, never invented (FR-03).
 *
 * @param scheduledTime NET (no earlier than) time; read together with timePrecision
 * @param timePrecision source precision label ("Day", "Month"…); absent means exact
 * @param detailLevel "summary" or "full"
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LaunchView(
        String id,
        String externalId,
        String name,
        String missionName,
        String description,
        String category,
        String missionType,
        String scheduledTime,
        String timePrecision,
        String windowStart,
        String windowEnd,
        LaunchStatus status,
        ProviderView provider,
        Rocket rocket,
        Site site,
        Payload payload,
        String imageUrl,
        String thumbnailUrl,
        MediaCredit imageCredit,
        List<SourceLink> links,
        List<Milestone> milestones,
        List<LaunchSnapshotView> scheduleHistory,
        List<Update> updates,
        String lastUpdated,
        String detailLevel) {

    public LaunchView withScheduleHistory(List<LaunchSnapshotView> history) {
        return new LaunchView(
                id,
                externalId,
                name,
                missionName,
                description,
                category,
                missionType,
                scheduledTime,
                timePrecision,
                windowStart,
                windowEnd,
                status,
                provider,
                rocket,
                site,
                payload,
                imageUrl,
                thumbnailUrl,
                imageCredit,
                links,
                milestones,
                history.isEmpty() ? null : history,
                updates,
                lastUpdated,
                detailLevel);
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Rocket(String id, String name, String family, String variant, String providerId, RocketSpecs specs) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record RocketSpecs(
            Double heightM, Double diameterM, Double leoCapacityKg, Integer stages, Boolean reusable) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Site(
            String id, String name, String location, String countryCode, Double latitude, Double longitude) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Payload(String type, String customer, String orbit, String destination) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record MediaCredit(String credit, String license, String licenseUrl) {}

    /** @param kind "official", "webcast", "article" or "data" */
    public record SourceLink(String label, String url, String kind) {}

    /**
     * @param offsetSeconds seconds relative to liftoff; negative before
     * @param estimated true when timing comes from a generic profile rather than mission data
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Milestone(
            String id, String name, String description, Integer offsetSeconds, boolean estimated, String source) {}

    /** A sourced, timestamped note about the launch, e.g. "Now targeting Oct 13". */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Update(String id, String comment, String createdOn, String infoUrl, String author) {}
}
